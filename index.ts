import {loadSo} from './soutils'
import {basename} from 'path'
import { _frida_err, _frida_hexdump, _frida_log } from './fridautils'
import  {info as soinfo} from './patchso'
//////////////////////////////////////////////////
// global variables 
let soname = 'libMyGame.so'

let inject = ()=>{
    let m = Process.getModuleByName(soname)
    {
        let funname = '_ZN7cocos2d11Application11getInstanceEv'
        let funp = Module.getExportByName(soname,funname)
        console.log(JSON.stringify(funp))
    }
    let loadm = loadSo(soinfo,
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
    console.log(JSON.stringify(loadm))

    if(loadm.syms?.init!=undefined){
        new NativeFunction(loadm.syms.init,'int',['pointer'])(m.base)
    }

    // patch 
    let pathes:{[key:string]:Function}= {

hook_key_input : function() {
    {
        Java.perform(()=>{
            let Cocos2dxGLSurfaceView = Java.use('org.cocos2dx.lib.Cocos2dxGLSurfaceView')
            Cocos2dxGLSurfaceView.onKeyDown.overload('int', 'android.view.KeyEvent').implementation = function(keyCode:number, keyEvent:Object) {
                let funp = loadm?.syms?.handle_keycode
                if(funp==undefined) throw `can not find handle_key`;
                let handled =  new NativeFunction(funp, 'bool',['pointer','uint','bool'])(Process.getModuleByName(soname).base, keyCode, 1);
                return true;
            };
            Cocos2dxGLSurfaceView.onKeyUp.overload('int', 'android.view.KeyEvent').implementation = function(keyCode:number, keyEvent:Object) {
                let funp = loadm?.syms?.handle_keycode
                if(funp==undefined) throw `can not find handle_key`;
                let handled =  new NativeFunction(funp, 'bool',['pointer','uint','bool'])(Process.getModuleByName(soname).base, keyCode, 0);
                return true;
            };
        })
    }
},

    };
    
    Object.keys(pathes).forEach(k => {
        console.log('patch', k)
        let handle = pathes[k];
        handle();
    });;
}

let main = ()=>{
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
                            inject(); // inject our code after invoked GameScene::init 
                        },
                    })
                }
            },
        });
    })
    // inject when then game has been started
    inject();
}

console.log('hello world')
main();
