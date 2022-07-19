
'use strict';

import { off } from "process";

export let _frida_log = new NativeCallback(function(sp:NativePointer){
        let s = sp.readUtf8String();
        console.log(s)
},'void',['pointer']);

export let _frida_err = new NativeCallback(function(sp:NativePointer){
    let s = sp.readUtf8String();
    console.log(s)
    throw `error occured`;
    return ;
},'void',['pointer']);

export let _frida_hexdump = new NativeCallback(function(sp:NativePointer, l:number){
    console.log(hexdump(sp, {
        offset: 0,
        length: l,
        header: true,
        ansi: false
    }));
},'void',['pointer','uint']);

export let logWithFileNameAndLineNo = (msg:string)=>{
    let getErrorObject = function(){
        try{throw Error('');} catch(err) {return err;}
    }
    let err = getErrorObject() as Error;
    const caller_line = err.stack!=undefined?err.stack.split("\n")[3] : "unknow line";
    // remove `at `
    let index = caller_line?.indexOf('at ');
    let final_caller_line = (index>=0) ?caller_line.slice(index+3) : caller_line;
    console.log(final_caller_line, ":", msg)
}

export let showAsmCode = (p:NativePointer, sz?: number| undefined, parser?:Function)=>{
    if(parser==undefined) parser=Instruction.parse;
    if (sz == undefined) sz = 5;
    for(let offset = 0; offset<sz; ){
        try{
            const inst = parser(p.add(offset))
            console.log(p.add(offset), ptr(offset), inst.toString())
            offset+= inst.size;
        }
        catch(e){
            console.log(`can parse instruction at ${p.add(offset)}`)
            offset += Process.pointerSize;
        }
    }
}

export let dumpMemory = (p:NativePointer, l?:number|undefined)=>{
    if (l == undefined) l = 0x20;
    console.log(hexdump(p, {
        offset: 0,
        length: l,
        header: true,
        ansi: false
    }));
};


