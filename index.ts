import {loadSo} from './soutils'
import {basename} from 'path'
import {inlineHookPatch, restoreAllInlineHooks} from './patchutils'
import {showAsmCode, dumpMemory, _frida_err, _frida_hexdump, _frida_log} from './fridautils'
import {info as patchsoinfo} from './patchso'
import {info as soinfo} from './so'
import { info } from 'console'
import { write } from 'fs'

//////////////////////////////////////////////////
// global variables 
let soname = 'libMyGame.so'

let loadPatchSo = ()=>{
    let loadm = loadSo(patchsoinfo,
        {
            _frida_log:     _frida_log,
            _frida_err:     _frida_err,
            _frida_hexdump: _frida_hexdump,
        },
        [
            '__google_potentially_blocking_region_begin',
            '__google_potentially_blocking_region_end',
        ],
        [
            soname
        ],)
    // console.log(JSON.stringify(loadm))
    return loadm;
}
let inject = ()=>{
    let m = Process.getModuleByName(soname)
    let loadm = loadPatchSo();
    if(loadm.syms?.init!=undefined){
        new NativeFunction(loadm.syms.init,'int',['pointer'])(m.base)
    }

    // patch 
    let pathes:{[key:string]:Function}= {

hook_key_input : function() {
    {
        Java.perform(()=>{
            {
                let Cocos2dxGLSurfaceView = Java.use('org.cocos2dx.lib.Cocos2dxGLSurfaceView')
                Cocos2dxGLSurfaceView.onKeyDown.overload('int', 'android.view.KeyEvent').implementation = function(keyCode:number, event:any) {
                    {
                        let funp = loadm?.syms?.handle_keycode
                        if(funp==undefined) throw `can not find handle_keycode`;
                        let keyevent = Java.cast(event, Java.use('android.view.KeyEvent'))
                        let scanCode = keyevent.getScanCode();
                        let handled =  new NativeFunction(funp, 'int',['pointer','int','int', 'int'])(m.base, keyCode, scanCode, 1);
                    }
                    {
                        let funp = loadm?.syms?.isPaused
                        if(funp==undefined) throw `can not find isPaused`;
                        let paused = new NativeFunction(funp,'bool', ['pointer'])(m.base)
                        if(!paused) return this.onKeyDown(keyCode, event);
                        else return true;
                    }
                };
                Cocos2dxGLSurfaceView.onKeyUp.overload('int', 'android.view.KeyEvent').implementation = function(keyCode:number, event:any) {
                    {
                        let funp = loadm?.syms?.handle_keycode
                        if(funp==undefined) throw `can not find handle_keycode`;
                        let keyevent = Java.cast(event, Java.use('android.view.KeyEvent'))
                        let scanCode = keyevent.getScanCode();
                        let handled =  new NativeFunction(funp, 'int',['pointer','int','int', 'int'])(m.base, keyCode, scanCode, 0);
                    }
                    {
                        let funp = loadm?.syms?.isPaused
                        if(funp==undefined) throw `can not find isPaused`;
                        let paused = new NativeFunction(funp,'bool', ['pointer'])(m.base)
                        if(!paused) return this.onKeyUp(keyCode, event);
                        else return true;
                    }
                };
            }
        })
    }
},

hook_touch : function() {
    {
        Java.perform(()=>{
            let Cocos2dxRenderer = Java.use('org.cocos2dx.lib.Cocos2dxRenderer')
            Cocos2dxRenderer.handleActionDown.overload('int', 'float','float').implementation = function(id:number, x:number, y:number) {
                {
                    let funp = loadm?.syms?.handle_touch
                    if(funp==undefined) throw `can not find handle_touch`;
                    let handled =  new NativeFunction(funp, 'int',['pointer','int','float', 'float','bool'])(m.base, id, x, y, 1);
                }
                {
                    let funp = loadm?.syms?.isPaused
                    if(funp==undefined) throw `can not find isPaused`;
                    let paused = new NativeFunction(funp,'bool', ['pointer'])(m.base)
                    if(!paused) this.handleActionDown(id, x,y);
                }
            };
            Cocos2dxRenderer.handleActionUp.overload('int', 'float','float').implementation = function(id:number, x:number, y:number) {
                {
                    let funp = loadm?.syms?.handle_touch
                    if(funp==undefined) throw `can not find handle_touch`;
                    let handled =  new NativeFunction(funp, 'int',['pointer','int','float', 'float','bool'])(m.base, id, x, y, 0);
                }
                {
                    let funp = loadm?.syms?.isPaused
                    if(funp==undefined) throw `can not find isPaused`;
                    let paused = new NativeFunction(funp,'bool', ['pointer'])(m.base)
                    if(!paused) this.handleActionUp(id, x,y);
                }
            };
            Cocos2dxRenderer.handleActionMove.overload('[I', '[F', '[F').implementation = function(ids:number[], xs:number[], ys:number[]) {
                {
                    let funp = loadm?.syms?.handle_move
                    if(funp==undefined) throw `can not find handle_move`;
                    //only pass one pointer
                    let handled =  new NativeFunction(funp, 'int',['pointer','int','float', 'float'])(m.base, ids[0], xs[0], ys[0]);
                }
                {
                    let funp = loadm?.syms?.isPaused
                    if(funp==undefined) throw `can not find isPaused`;
                    let paused = new NativeFunction(funp,'bool', ['pointer'])(m.base)
                    if(!paused) this.handleActionUp(ids, xs,ys);
                }
            };
        })
    }
},

hook_eglSwapBuffers : function(){
    {
        let funname = 'eglSwapBuffers'
        let funp = Module.getExportByName(null, funname);
        console.log('before' )
        showAsmCode(funp)
        Interceptor.attach(funp,{
            onEnter : function(args){
                let funp = loadm?.syms?.hook_eglSwapBuffers;
                if(funp==undefined) throw `can not find eglSwapBuffers`
                new NativeFunction(funp,'int',['pointer'])(m.base)
            }
        })
        console.log('after' )
        showAsmCode(funp)
    }

},

    };
    
    Object.keys(pathes).forEach(k => {
        console.log('patch', k)
        let handle = pathes[k];
        handle();
    });;

}

let test = function()
{
    let m = Process.findModuleByName(soname);
    if(m==null) return;
    let loadm  = loadPatchSo();

    let trampoline_ptr = m.base.add(soinfo.loads[0].virtual_size);
    let trampoline_ptr_end = m.base.add(soinfo.loads[1].virtual_address);

    let infos;
    let frida_fun = new NativeCallback(function(sp:NativePointer){
        console.log(sp.readUtf8String(),'from frida_fun')
    },'void',['pointer'])

    const cm = new CModule(`
//#include <stdio.h>
void _frida_fun(const char* s);
void fun(void) {
  //printf("Hello World from CModule\\n");
  _frida_fun("Hello World from CModule\\n");
}
`,{
    _frida_fun: frida_fun,
});

console.log(JSON.stringify(cm));

const hello = new NativeFunction(cm.fun, 'void', []);
//hello();

    let arch = Process.arch;
    if(arch == 'arm64'){
        infos = [
            //{hook_ptr :m.base.add(0x2f371c), hook_fun_ptr:loadm?.syms.hook_test1 },
            //{hook_ptr :m.base.add(0x2f372c), hook_fun_ptr:loadm?.syms.hook_test1 },
            // {hook_ptr :m.base.add(0x2dc864), hook_fun_ptr:loadm?.syms.hook_test1  },
            {hook_ptr :m.base.add(0x2dc864), hook_fun_ptr:cm.fun  },
        ]
    }
    else if(arch=='arm'){
        infos = [
            {hook_ptr :m.base.add(0x1f3701), hook_fun_ptr:loadm?.syms.hook_test1  },
        ]
    }
    else{
        throw `unhandle architecture ${arch}`
    }
    infos.forEach(h=>{
        let m = Process.getModuleByName(soname)
        let hook_ptr = h.hook_ptr;
        let hook_fun_ptr = h.hook_fun_ptr;
        console.log(JSON.stringify(h))
        console.log(hook_fun_ptr)
        console.log('origin code')
        dumpMemory(hook_ptr, 0x10)
        if(hook_fun_ptr==undefined) throw `can not find hook_fun_ptr when handle ${JSON.stringify(h)}`
        let sz = inlineHookPatch(trampoline_ptr,hook_ptr, hook_fun_ptr, m.base);
        trampoline_ptr = trampoline_ptr.add(sz)
        if(trampoline_ptr.compare(trampoline_ptr_end)>=0){
            throw `trampoline_ptr beyond of trampoline_ptr_end, ${trampoline_ptr}/${trampoline_ptr_end}`
        }
    });
}


let main = ()=>{
    let fun = inject;
    // early inject 
    let funs = ['dlopen', 'android_dlopen_ext']
    funs.forEach(f=>{
        let funp = Module.getExportByName(null,f);
        console.log('before attach', funp); dumpMemory(funp)
        Interceptor.attach(funp,{
            onEnter:function(args){
                let loadpath = args[0].readUtf8String();
                if(loadpath!=null) this.name = basename(loadpath);
            },
            onLeave:function(retval){
                // soname have loaded at this moment 
                if(this.name == soname){
                    let funname = '_ZN9GameScene4initEv'; //GameScene::init(void)
                    Interceptor.attach(Module.getExportByName(soname, funname),{
                        onLeave:function(retval){
                            fun(); // inject our code after invoked GameScene::init 
                        },
                    })
                }
            },
        });
        console.log('after attach', funp); dumpMemory(funp)
    })
    // inject when then game has been started
    fun();
}

let android_output = (s:string)=>{
    let funp = Module.getExportByName(null,'__android_log_print')
    let fun = new NativeFunction(funp, 'int',['int','pointer','pointer'])
    fun(0, Memory.allocUtf8String("frida"), Memory.allocUtf8String(s))

}

let cleanup = ()=>{
    console.log('cleanup for Typescript')
    restoreAllInlineHooks()
}
// rpc.exports.unload = function(){
//     cleanup();
// }

rpc.exports.dispose = function(){
    console.log("call dispose")
    //android_output('android call dispose')
    cleanup();
}

console.log('########################################');
main();





