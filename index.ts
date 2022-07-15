import {loadSo} from './soutils'
import {basename} from 'path'
import {inlineHookPatch, restoreAllInlineHooks} from './patchutils'
import { showAsmCode, _frida_err, _frida_hexdump, _frida_log } from './fridautils'
import  {info as patchsoinfo} from './patchso'
import  {info as soinfo} from './so'
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
    {
        let funname = '_ZN7cocos2d11Application11getInstanceEv'
        let funp = Module.getExportByName(soname,funname)
        console.log(JSON.stringify(funp))
    }

    let loadm  = loadPatchSo();

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
    let m = Process.findModuleByName(soname)
    if(m==null) return;
    let loadm  = loadPatchSo();
    let trampoline_ptr = m.base.add(soinfo.loads[0].virtual_size);
    let hook_ptr = m.base.add(0x2DC85C)
    let funp = loadm?.syms?.hook_test;
    if(funp==undefined) throw `can not find hook_test`
    let hook_fun_ptr = funp;
    inlineHookPatch(trampoline_ptr,hook_ptr, hook_fun_ptr, m.base);
}


let main = ()=>{
    let fun = test;
    // early inject 
    let funs = ['dlopen', 'android_dlopen_ext']
    funs.forEach(f=>{
        Interceptor.attach(Module.getExportByName(null,f),{
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
    })
    // inject when then game has been started
    fun();
}


rpc.exports.unload = function(){
    console.log('unload called for Typescript')
    restoreAllInlineHooks()
}

console.log('########################################');
main();





