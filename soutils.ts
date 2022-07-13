'use strict';

import {_frida_err, _frida_log, logWithFileNameAndLineNo} from './fridautils'
// store load buffer to global variable to void frida's GC to release loaded buffer
export let loadedBuff =ptr(0);
//////////////////////////////////////////////////
// type defines
type RelocationType = {address:number, addend:number, size:number, sym_name:string, type:number};
type SoInfoType = {

    machine_type: string,
    load_size   : number,
    name        : string,

    loads: {
        virtual_address: number,
        virtual_size   : number,
        alignment      : number,
        file_offset    : number,
        size           : number,
        content?       : number[],
    }[],

    exported_symbols    : {name:string, address:number}[],
    relocations         : RelocationType[],
    ctors_offset        : number,
    ctor_functions      : number[],
    dtors_offset        : number,
    dtor_functions      : number[],
};

type LoadSoInfoType = {
    buff: NativePointer,
    syms: {[key:string]:NativePointer} ,
};

type SymbolMap = {[key:string]:NativePointer};

function readBinaryFromFileWithRange(fn:string, p:NativePointer, sz:number, offset:number){
    let cm = new CModule(`
        typedef unsigned int size_t;
        extern void _frida_err(char * );
        extern int fseek(void *stream, long offset, int whence);
        extern size_t fread(void *ptr, size_t size, size_t nmemb, void *stream);
        extern int fclose(void *stream);
        extern void *fopen( char *pathname,  char *mode);
        #define SEEK_SET 0
        int fun(char* fn, void*p, unsigned int sz, unsigned int offset ){
            void* fp = fopen(fn, "rb");
            if(!fp) _frida_err("can not open file ");
            fseek(fp, offset, SEEK_SET);
            fread(p, 1, sz, fp);
            fclose(fp);
            return 0;
        }
    `,{
        _frida_err : _frida_err,
        fopen : Module.getExportByName(null,'fopen'),
        fseek : Module.getExportByName(null,'fseek'),
        fread : Module.getExportByName(null,'fread'),
        fclose: Module.getExportByName(null,'fclose'),
    })

    let fun = new NativeFunction(cm.fun, 'int',['pointer', 'pointer', 'uint', 'uint']);
    return fun(Memory.allocUtf8String(fn), p, sz, offset);
}

function resolveSymbol(sym_name:string, exportSyms?:SymbolMap, syms?:SymbolMap, libs?:string[]):null|NativePointer{
    if (exportSyms!=undefined && sym_name in exportSyms) return exportSyms[sym_name];
    if (syms!=undefined && sym_name in syms) return syms[sym_name];
    {
        let found=false
        let symp=ptr(0)
        if(libs!=undefined){
            libs.forEach(soname=>{
                if(found) return ;
                let p = Module.findExportByName(soname,sym_name);
                if(p!=null){found=true;symp=p;}
                {
                    let m = Process.getModuleByName(soname);
                    m.enumerateSymbols()
                        .filter(e=>{
                            return e.name==sym_name;
                        })
                        .forEach(e=>{
                            found=true;
                            symp=e.address;
                        })
                }
            })
        }
        if(found) return symp;
    }
    {
        let p = Module.findExportByName(null, sym_name);
        if(p!=null) return p;
    }
    return null;
}

export function loadSo(info:SoInfoType, syms?:{[key:string]:NativePointer}, ignoreSymbols?:string[], libs?:string[], dir?:string):LoadSoInfoType
{
    if(dir==undefined) dir='/data/local/tmp';
    // sanity check
    let arch = Process.arch;
    if(arch=='arm'){
        if(info.machine_type!='ARM')  throw `archtecture mismatch ${info.machine_type}/${Process.arch}`
    }
    else if (arch=='arm64'){
        if(info.machine_type!='AARCH64')  throw `archtecture mismatch ${info.machine_type}/${Process.arch}`
    }
    else{
        throw `unsupported archtecture ${arch}`
    }

    let buff = Memory.alloc(info.load_size);
    loadedBuff=buff;
    Memory.protect(buff, info.load_size, 'rwx');
    // allocate memory fot new so
    if(info.loads!=undefined)
    {
        info.loads.forEach(l=>{
            // load 
            if(l.content!=undefined){
                buff.add(l.virtual_address).writeByteArray(l.content);
            }
            else{
                // read from file
                let fn = dir + '/' + info.name;
                readBinaryFromFileWithRange(fn, buff.add(l.virtual_address), l.size, l.file_offset);
            }
        })
    }

    // handle export syms
    let exportSyms:SymbolMap ={};
    {
        info.exported_symbols.forEach(s=>{
            let p = buff.add(s.address);
            exportSyms[s.name] = p;
        })
    }

    // handle relocations for hot patch 
    if(info.relocations!=undefined) {
        let reloc_handlers : {[key:number]:Function} = {
            23 : (r:RelocationType)=>{ // R_ARM_RELATIVE
                let p =buff.add(r.address).readPointer();
                buff.add(r.address).writePointer(buff.add(p));
            },

            21 : (r:RelocationType)=>{ // R_ARM_GLOB_DAT
                if(ignoreSymbols!=undefined && ignoreSymbols.indexOf(r.sym_name)>=0) { console.log("ignore", r.sym_name); return ; }
                let p = resolveSymbol(r.sym_name, exportSyms, syms, libs);
                if(p==null) throw(`can not found sym ${r.sym_name} when handle R_ARM_GLOB_DAT `)
                buff.add(r.address).writePointer(p) ;
            },

            22 : (r:RelocationType)=>{ // R_ARM_JUMP_SLOT
                if(ignoreSymbols!=undefined && ignoreSymbols.indexOf(r.sym_name)>=0) { console.log("ignore", r.sym_name); return ; }
                let p = resolveSymbol(r.sym_name, exportSyms, syms, libs);
                if(p==null) throw(`can not found sym ${r.sym_name} when handle R_ARM_JUMP_SLOT`)
                buff.add(r.address).writePointer(p) ;
            },

            2 : (r:RelocationType)=>{ // R_ARM_ABS32
                if(ignoreSymbols!=undefined && ignoreSymbols.indexOf(r.sym_name)>=0) { console.log("ignore", r.sym_name); return ; }
                let p = resolveSymbol(r.sym_name, exportSyms, syms, libs);
                if(p==null) throw(`can not found sym ${r.sym_name} when handle R_ARM_ABS32`)
                buff.add(r.address).writePointer(p) ;
            },

            257 : (r:RelocationType)=>{ // R_AARCH64_ABS64
                if(ignoreSymbols!=undefined && ignoreSymbols.indexOf(r.sym_name)>=0) { console.log("ignore", r.sym_name); return ; }
                let p = resolveSymbol(r.sym_name, exportSyms, syms, libs);
                if(p==null) throw(`can not found sym ${r.sym_name} when handle R_AARCH64_ABS64`)
                buff.add(r.address).writePointer(p) ;
            },

            1025 : (r:RelocationType)=>{ // R_AARCH64_GLOB_DA
                if(ignoreSymbols!=undefined && ignoreSymbols.indexOf(r.sym_name)>=0) { console.log("ignore", r.sym_name); return ; }
                let p = resolveSymbol(r.sym_name, exportSyms, syms, libs);
                if(p==null) throw(`can not found sym ${r.sym_name} when handle R_AARCH64_GLOB_DA`)
                buff.add(r.address).writePointer(p) ;
            },

            1026 : (r:RelocationType)=>{ // R_AARCH64_JUMP_SL
                if(ignoreSymbols!=undefined && ignoreSymbols.indexOf(r.sym_name)>=0) { console.log("ignore", r.sym_name); return ; }
                let p = resolveSymbol(r.sym_name, exportSyms, syms, libs);
                if(p==null) throw(`can not found sym ${r.sym_name} when handle R_AARCH64_GLOB_DA`)
                buff.add(r.address).writePointer(p) ;
            },

            1027 : (r:RelocationType)=>{ // R_AARCH64_RELATIV
                buff.add(r.address).writePointer(buff.add(r.addend));
            },

        }
        info.relocations.forEach(r=>{
            if(r.type in reloc_handlers){
                reloc_handlers[r.type](r);
            }
            else{
                throw `unhandle relocation type ${r.type}`
            }
        })
    }

    // handle ctor_functions
    if(info.ctor_functions!=undefined)
    {
        console.log('call ctors', info.ctor_functions.length)
        let ctors_count =info.ctor_functions.length 
        for(let t = 0;t<ctors_count;t++){
            let a = info.ctor_functions[t]
            if(a==0) {
                let p = buff.add(info.ctors_offset+t*Process.pointerSize).readPointer()
                console.log('call ctor', p)
                if(p.equals(0)) continue;
                new NativeFunction(p, 'void', [])();
            }
            else{
                let p = buff.add(a)
                new NativeFunction(p, 'void', [])();
                buff.add(info.ctors_offset+t*Process.pointerSize).writePointer(p)
            }
        }
    }

    // handle dtor_functions
    if(info.dtor_functions!=undefined)
    {
        for(let t = 0;t<info.dtor_functions.length;t++){
            let a = info.dtor_functions[t]
            if(a==0) {
            }
            else{
                let p = buff.add(a) // do not call the dtor functions now
                buff.add(info.dtors_offset+t*Process.pointerSize).writePointer(p)
            }
        }
    }

    return {buff:buff, syms:exportSyms};
}
