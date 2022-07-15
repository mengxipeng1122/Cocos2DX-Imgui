
'use strict';


import { write } from "fs";
import { showAsmCode } from "./fridautils";

////////////////////////////////////////////////////////////////////////////////
// thumb related 
export function putThumbNop(sp:NativePointer, ep?:NativePointer):void{
    if (ep==undefined) ep = sp.add(2)
    for (let p = sp; p.compare(ep) < 0; p = p.add(2)) {
        Memory.patchCode(p, 2, patchaddr => {
            var cw = new ThumbWriter(patchaddr);
            cw.putNop()
            cw.flush();
        });
    }
}

export function putThumbHookPatch(trampoline_ptr:NativePointer, hook_ptr:NativePointer, hook_fun_ptr:NativePointer, para1:NativePointer, origin_inst?:number[]):number
{
    let trampoline_len = 0x30;
    //console.log(trampoline_ptr)
    Memory.protect(trampoline_ptr, trampoline_len, 'rwx');
trampoline_ptr.add(0x0).writeByteArray([ 0xff, 0xb4 ]); // 0x0:	push	{r0, r1, r2, r3, r4, r5, r6, r7}
trampoline_ptr.add(0x2).writeByteArray([ 0x2d, 0xe9, 0x0, 0x5f ]); // 0x2:	push.w	{r8, sb, sl, fp, ip, lr}
trampoline_ptr.add(0x6).writeByteArray([ 0xef, 0xf3, 0x0, 0x80 ]); // 0x6:	mrs	r0, apsr
trampoline_ptr.add(0xa).writeByteArray([ 0x1, 0xb4 ]); // 0xa:	push	{r0}
trampoline_ptr.add(0xc).writeByteArray([ 0x0, 0xbf ]); // 0xc:	nop
trampoline_ptr.add(0xe).writeByteArray([ 0x69, 0x46 ]); // 0xe:	mov	r1, sp
trampoline_ptr.add(0x10).writeByteArray([ 0x5, 0x48 ]); // 0x10:	ldr	r0, [pc, #0x14]
trampoline_ptr.add(0x12).writeByteArray([ 0x6, 0x4c ]); // 0x12:	ldr	r4, [pc, #0x18]
trampoline_ptr.add(0x14).writeByteArray([ 0xa0, 0x47 ]); // 0x14:	blx	r4
trampoline_ptr.add(0x16).writeByteArray([ 0x1, 0xbc ]); // 0x16:	pop	{r0}
trampoline_ptr.add(0x18).writeByteArray([ 0x80, 0xf3, 0x0, 0x89 ]); // 0x18:	msr	cpsr_fc, r0
trampoline_ptr.add(0x1c).writeByteArray([ 0xbd, 0xe8, 0x0, 0x5f ]); // 0x1c:	pop.w	{r8, sb, sl, fp, ip, lr}
trampoline_ptr.add(0x20).writeByteArray([ 0xff, 0xbc ]); // 0x20:	pop	{r0, r1, r2, r3, r4, r5, r6, r7}
trampoline_ptr.add(0x22).writeByteArray([ 0x0, 0xbf ]); // 0x22:	nop
trampoline_ptr.add(0x24).writeByteArray([ 0x0, 0xbf ]); // 0x24:	nop
trampoline_ptr.add(0x26).writeByteArray([ 0x70, 0x47 ]); // 0x26:	bx	lr
trampoline_ptr.add(0x28).writeByteArray([ 0x0, 0xbf ]); // 0x28:	nop
trampoline_ptr.add(0x2a).writeByteArray([ 0x0, 0xbf ]); // 0x2a:	nop
trampoline_ptr.add(0x2c).writeByteArray([ 0x0, 0xbf ]); // 0x2c:	nop
trampoline_ptr.add(0x2e).writeByteArray([ 0x0, 0xbf ]); // 0x2e:	nop

    if(origin_inst!=undefined) trampoline_ptr.add(0x22).writeByteArray(origin_inst);
    trampoline_ptr.add(0x28).writePointer(para1)
    trampoline_ptr.add(0x2c).writePointer(hook_fun_ptr)
    {
        let p = ptr((hook_ptr.toUInt32() & (~1))>>>0);
        Memory.patchCode(p, 4, patchaddr => {
            var cw = new ThumbWriter(patchaddr);
            cw.putBlImm(trampoline_ptr) 
            cw.flush();
        });
    }
    return trampoline_len;
}

////////////////////////////////////////////////////////////////////////////////
// x64 related

export function putX64HookPatch(trampoline_ptr:NativePointer, hook_ptr:NativePointer, hook_fun_ptr:NativePointer, para1:NativePointer, origin_inst:number[]):number
{
    let trampoline_len = 0x6a;
    console.log(trampoline_ptr)
    Memory.protect(trampoline_ptr, trampoline_len, 'rwx');
    //x64 code
 trampoline_ptr.add(0x0).writeByteArray([ 0x66, 0x9c ]); // 0x0:	pushf	 
 trampoline_ptr.add(0x2).writeByteArray([ 0x50 ]); // 0x2:	push	rax 
 trampoline_ptr.add(0x3).writeByteArray([ 0x51 ]); // 0x3:	push	rcx 
 trampoline_ptr.add(0x4).writeByteArray([ 0x52 ]); // 0x4:	push	rdx 
 trampoline_ptr.add(0x5).writeByteArray([ 0x53 ]); // 0x5:	push	rbx 
 trampoline_ptr.add(0x6).writeByteArray([ 0x55 ]); // 0x6:	push	rbp 
 trampoline_ptr.add(0x7).writeByteArray([ 0x56 ]); // 0x7:	push	rsi 
 trampoline_ptr.add(0x8).writeByteArray([ 0x57 ]); // 0x8:	push	rdi 
 trampoline_ptr.add(0x9).writeByteArray([ 0x41, 0x50 ]); // 0x9:	push	r8 
 trampoline_ptr.add(0xb).writeByteArray([ 0x41, 0x51 ]); // 0xb:	push	r9 
 trampoline_ptr.add(0xd).writeByteArray([ 0x41, 0x52 ]); // 0xd:	push	r10 
 trampoline_ptr.add(0xf).writeByteArray([ 0x41, 0x53 ]); // 0xf:	push	r11 
 trampoline_ptr.add(0x11).writeByteArray([ 0x41, 0x54 ]); // 0x11:	push	r12 
 trampoline_ptr.add(0x13).writeByteArray([ 0x41, 0x55 ]); // 0x13:	push	r13 
 trampoline_ptr.add(0x15).writeByteArray([ 0x41, 0x56 ]); // 0x15:	push	r14 
 trampoline_ptr.add(0x17).writeByteArray([ 0x41, 0x57 ]); // 0x17:	push	r15 
 trampoline_ptr.add(0x19).writeByteArray([ 0x48, 0x8d, 0x34, 0x24 ]); // 0x19:	lea	rsi, [rsp] 
 trampoline_ptr.add(0x1d).writeByteArray([ 0x48, 0x8d, 0x5, 0x0, 0x0, 0x0, 0x0 ]); // 0x1d:	lea	rax, [rip] 
 trampoline_ptr.add(0x24).writeByteArray([ 0x48, 0x8b, 0x40, 0x36 ]); // 0x24:	mov	rax, qword ptr [rax + 0x36] 
 trampoline_ptr.add(0x28).writeByteArray([ 0x48, 0x8d, 0x38 ]); // 0x28:	lea	rdi, [rax] 
 trampoline_ptr.add(0x2b).writeByteArray([ 0x48, 0x8d, 0x5, 0x0, 0x0, 0x0, 0x0 ]); // 0x2b:	lea	rax, [rip] 
 trampoline_ptr.add(0x32).writeByteArray([ 0x48, 0x8b, 0x40, 0x30 ]); // 0x32:	mov	rax, qword ptr [rax + 0x30] 
 trampoline_ptr.add(0x36).writeByteArray([ 0xff, 0xd0 ]); // 0x36:	call	rax 
 trampoline_ptr.add(0x38).writeByteArray([ 0x41, 0x5f ]); // 0x38:	pop	r15 
 trampoline_ptr.add(0x3a).writeByteArray([ 0x41, 0x5e ]); // 0x3a:	pop	r14 
 trampoline_ptr.add(0x3c).writeByteArray([ 0x41, 0x5d ]); // 0x3c:	pop	r13 
 trampoline_ptr.add(0x3e).writeByteArray([ 0x41, 0x5c ]); // 0x3e:	pop	r12 
 trampoline_ptr.add(0x40).writeByteArray([ 0x41, 0x5b ]); // 0x40:	pop	r11 
 trampoline_ptr.add(0x42).writeByteArray([ 0x41, 0x5a ]); // 0x42:	pop	r10 
 trampoline_ptr.add(0x44).writeByteArray([ 0x41, 0x59 ]); // 0x44:	pop	r9 
 trampoline_ptr.add(0x46).writeByteArray([ 0x41, 0x58 ]); // 0x46:	pop	r8 
 trampoline_ptr.add(0x48).writeByteArray([ 0x5f ]); // 0x48:	pop	rdi 
 trampoline_ptr.add(0x49).writeByteArray([ 0x5e ]); // 0x49:	pop	rsi 
 trampoline_ptr.add(0x4a).writeByteArray([ 0x5d ]); // 0x4a:	pop	rbp 
 trampoline_ptr.add(0x4b).writeByteArray([ 0x5b ]); // 0x4b:	pop	rbx 
 trampoline_ptr.add(0x4c).writeByteArray([ 0x5a ]); // 0x4c:	pop	rdx 
 trampoline_ptr.add(0x4d).writeByteArray([ 0x59 ]); // 0x4d:	pop	rcx 
 trampoline_ptr.add(0x4e).writeByteArray([ 0x58 ]); // 0x4e:	pop	rax 
 trampoline_ptr.add(0x4f).writeByteArray([ 0x66, 0x9d ]); // 0x4f:	popf	 
 trampoline_ptr.add(0x51).writeByteArray([ 0x90 ]); // 0x51:	nop	 
 trampoline_ptr.add(0x52).writeByteArray([ 0x90 ]); // 0x52:	nop	 
 trampoline_ptr.add(0x53).writeByteArray([ 0x90 ]); // 0x53:	nop	 
 trampoline_ptr.add(0x54).writeByteArray([ 0x90 ]); // 0x54:	nop	 
 trampoline_ptr.add(0x55).writeByteArray([ 0x90 ]); // 0x55:	nop	 
 trampoline_ptr.add(0x56).writeByteArray([ 0x90 ]); // 0x56:	nop	 
 trampoline_ptr.add(0x57).writeByteArray([ 0x90 ]); // 0x57:	nop	 
 trampoline_ptr.add(0x58).writeByteArray([ 0x90 ]); // 0x58:	nop	 
 trampoline_ptr.add(0x59).writeByteArray([ 0xc3 ]); // 0x59:	ret	 
 trampoline_ptr.add(0x5a).writeByteArray([ 0x90 ]); // 0x5a:	nop	 
 trampoline_ptr.add(0x5b).writeByteArray([ 0x90 ]); // 0x5b:	nop	 
 trampoline_ptr.add(0x5c).writeByteArray([ 0x90 ]); // 0x5c:	nop	 
 trampoline_ptr.add(0x5d).writeByteArray([ 0x90 ]); // 0x5d:	nop	 
 trampoline_ptr.add(0x5e).writeByteArray([ 0x90 ]); // 0x5e:	nop	 
 trampoline_ptr.add(0x5f).writeByteArray([ 0x90 ]); // 0x5f:	nop	 
 trampoline_ptr.add(0x60).writeByteArray([ 0x90 ]); // 0x60:	nop	 
 trampoline_ptr.add(0x61).writeByteArray([ 0x90 ]); // 0x61:	nop	 
 trampoline_ptr.add(0x62).writeByteArray([ 0x90 ]); // 0x62:	nop	 
 trampoline_ptr.add(0x63).writeByteArray([ 0x90 ]); // 0x63:	nop	 
 trampoline_ptr.add(0x64).writeByteArray([ 0x90 ]); // 0x64:	nop	 
 trampoline_ptr.add(0x65).writeByteArray([ 0x90 ]); // 0x65:	nop	 
 trampoline_ptr.add(0x66).writeByteArray([ 0x90 ]); // 0x66:	nop	 
 trampoline_ptr.add(0x67).writeByteArray([ 0x90 ]); // 0x67:	nop	 
 trampoline_ptr.add(0x68).writeByteArray([ 0x90 ]); // 0x68:	nop	 
 trampoline_ptr.add(0x69).writeByteArray([ 0x90 ]); // 0x69:	nop	 

    // trampoline_ptr.writeByteArray(typedArrayToBuffer( new Uint8Array([
    console.log('hook_fun_ptr', hook_fun_ptr)
    trampoline_ptr.add(0x51).writeByteArray(origin_inst);
    trampoline_ptr.add(0x5a).writePointer(para1)
    trampoline_ptr.add(0x62).writePointer(hook_fun_ptr)
    {
        let p = hook_ptr;
        Memory.patchCode(p, 4, patchaddr => {
            var cw = new X86Writer(patchaddr);
            cw.putCallAddress(trampoline_ptr);
            cw.flush();
        });
        {
            // put nop in hook 
            let n = origin_inst.length-5;
            if(n>0){
                Memory.protect(p.add(5),n, 'rwx')
                for(let t=0;t<n;t++) {
                    p.add(5+t).writeU8(0x90)
                }
                Memory.protect(p.add(5),n, 'r-x')
            }
        }
    }
    return trampoline_len;
}

// arm64 related
export function putArm64Nop(sp:NativePointer, ep?:NativePointer):void{
    if (ep==undefined) ep = sp.add(4)
    for (let p = sp; p.compare(ep) < 0; p = p.add(4)) {
        Memory.patchCode(p, 4, patchaddr => {
            var cw = new Arm64Writer(patchaddr);
            cw.putNop()
            cw.flush();
        });
    }
}


export function putArm64HookPatch(trampoline_ptr:NativePointer, hook_ptr:NativePointer, hook_fun_ptr:NativePointer, para1:NativePointer):number
{
    if(Process.arch!='arm64') throw(" please check archtecutre , should be arm64")
    let trampoline_len = 0xa8;
    //console.log(trampoline_ptr)
    Memory.protect(trampoline_ptr, trampoline_len, 'rwx');

 trampoline_ptr.add(0x0).writeByteArray([ 0xe1, 0x3, 0xbf, 0xa9 ]); // 0x0:	stp	x1, x0, [sp, #-0x10]! 
 trampoline_ptr.add(0x4).writeByteArray([ 0xe3, 0xb, 0xbf, 0xa9 ]); // 0x4:	stp	x3, x2, [sp, #-0x10]! 
 trampoline_ptr.add(0x8).writeByteArray([ 0xe5, 0x13, 0xbf, 0xa9 ]); // 0x8:	stp	x5, x4, [sp, #-0x10]! 
 trampoline_ptr.add(0xc).writeByteArray([ 0xe7, 0x1b, 0xbf, 0xa9 ]); // 0xc:	stp	x7, x6, [sp, #-0x10]! 
 trampoline_ptr.add(0x10).writeByteArray([ 0xe9, 0x23, 0xbf, 0xa9 ]); // 0x10:	stp	x9, x8, [sp, #-0x10]! 
 trampoline_ptr.add(0x14).writeByteArray([ 0xeb, 0x2b, 0xbf, 0xa9 ]); // 0x14:	stp	x11, x10, [sp, #-0x10]! 
 trampoline_ptr.add(0x18).writeByteArray([ 0xed, 0x33, 0xbf, 0xa9 ]); // 0x18:	stp	x13, x12, [sp, #-0x10]! 
 trampoline_ptr.add(0x1c).writeByteArray([ 0xef, 0x3b, 0xbf, 0xa9 ]); // 0x1c:	stp	x15, x14, [sp, #-0x10]! 
 trampoline_ptr.add(0x20).writeByteArray([ 0xf1, 0x43, 0xbf, 0xa9 ]); // 0x20:	stp	x17, x16, [sp, #-0x10]! 
 trampoline_ptr.add(0x24).writeByteArray([ 0xf3, 0x4b, 0xbf, 0xa9 ]); // 0x24:	stp	x19, x18, [sp, #-0x10]! 
 trampoline_ptr.add(0x28).writeByteArray([ 0xf5, 0x53, 0xbf, 0xa9 ]); // 0x28:	stp	x21, x20, [sp, #-0x10]! 
 trampoline_ptr.add(0x2c).writeByteArray([ 0xf7, 0x5b, 0xbf, 0xa9 ]); // 0x2c:	stp	x23, x22, [sp, #-0x10]! 
 trampoline_ptr.add(0x30).writeByteArray([ 0xf9, 0x63, 0xbf, 0xa9 ]); // 0x30:	stp	x25, x24, [sp, #-0x10]! 
 trampoline_ptr.add(0x34).writeByteArray([ 0xfb, 0x6b, 0xbf, 0xa9 ]); // 0x34:	stp	x27, x26, [sp, #-0x10]! 
 trampoline_ptr.add(0x38).writeByteArray([ 0xfd, 0x73, 0xbf, 0xa9 ]); // 0x38:	stp	x29, x28, [sp, #-0x10]! 
 trampoline_ptr.add(0x3c).writeByteArray([ 0xf, 0x42, 0x3b, 0xd5 ]); // 0x3c:	mrs	x15, nzcv 
 trampoline_ptr.add(0x40).writeByteArray([ 0xef, 0x7b, 0xbf, 0xa9 ]); // 0x40:	stp	x15, x30, [sp, #-0x10]! 
 trampoline_ptr.add(0x44).writeByteArray([ 0xe1, 0x3, 0x0, 0x91 ]); // 0x44:	mov	x1, sp 
 trampoline_ptr.add(0x48).writeByteArray([ 0xc0, 0x2, 0x0, 0x58 ]); // 0x48:	ldr	x0, #0x700000a0 
 trampoline_ptr.add(0x4c).writeByteArray([ 0xe9, 0x2, 0x0, 0x58 ]); // 0x4c:	ldr	x9, #0x700000a8 
 trampoline_ptr.add(0x50).writeByteArray([ 0x20, 0x1, 0x3f, 0xd6 ]); // 0x50:	blr	x9 
 trampoline_ptr.add(0x54).writeByteArray([ 0xef, 0x7b, 0xc1, 0xa8 ]); // 0x54:	ldp	x15, x30, [sp], #0x10 
 trampoline_ptr.add(0x58).writeByteArray([ 0xf, 0x42, 0x1b, 0xd5 ]); // 0x58:	msr	nzcv, x15 
 trampoline_ptr.add(0x5c).writeByteArray([ 0xfd, 0x73, 0xc1, 0xa8 ]); // 0x5c:	ldp	x29, x28, [sp], #0x10 
 trampoline_ptr.add(0x60).writeByteArray([ 0xfb, 0x6b, 0xc1, 0xa8 ]); // 0x60:	ldp	x27, x26, [sp], #0x10 
 trampoline_ptr.add(0x64).writeByteArray([ 0xf9, 0x63, 0xc1, 0xa8 ]); // 0x64:	ldp	x25, x24, [sp], #0x10 
 trampoline_ptr.add(0x68).writeByteArray([ 0xf7, 0x5b, 0xc1, 0xa8 ]); // 0x68:	ldp	x23, x22, [sp], #0x10 
 trampoline_ptr.add(0x6c).writeByteArray([ 0xf5, 0x53, 0xc1, 0xa8 ]); // 0x6c:	ldp	x21, x20, [sp], #0x10 
 trampoline_ptr.add(0x70).writeByteArray([ 0xf3, 0x4b, 0xc1, 0xa8 ]); // 0x70:	ldp	x19, x18, [sp], #0x10 
 trampoline_ptr.add(0x74).writeByteArray([ 0xf1, 0x43, 0xc1, 0xa8 ]); // 0x74:	ldp	x17, x16, [sp], #0x10 
 trampoline_ptr.add(0x78).writeByteArray([ 0xef, 0x3b, 0xc1, 0xa8 ]); // 0x78:	ldp	x15, x14, [sp], #0x10 
 trampoline_ptr.add(0x7c).writeByteArray([ 0xed, 0x33, 0xc1, 0xa8 ]); // 0x7c:	ldp	x13, x12, [sp], #0x10 
 trampoline_ptr.add(0x80).writeByteArray([ 0xeb, 0x2b, 0xc1, 0xa8 ]); // 0x80:	ldp	x11, x10, [sp], #0x10 
 trampoline_ptr.add(0x84).writeByteArray([ 0xe9, 0x23, 0xc1, 0xa8 ]); // 0x84:	ldp	x9, x8, [sp], #0x10 
 trampoline_ptr.add(0x88).writeByteArray([ 0xe7, 0x1b, 0xc1, 0xa8 ]); // 0x88:	ldp	x7, x6, [sp], #0x10 
 trampoline_ptr.add(0x8c).writeByteArray([ 0xe5, 0x13, 0xc1, 0xa8 ]); // 0x8c:	ldp	x5, x4, [sp], #0x10 
 trampoline_ptr.add(0x90).writeByteArray([ 0xe3, 0xb, 0xc1, 0xa8 ]); // 0x90:	ldp	x3, x2, [sp], #0x10 
 trampoline_ptr.add(0x94).writeByteArray([ 0xe1, 0x3, 0xc1, 0xa8 ]); // 0x94:	ldp	x1, x0, [sp], #0x10 
 trampoline_ptr.add(0x98).writeByteArray([ 0x1f, 0x20, 0x3, 0xd5 ]); // 0x98:	nop	 
 trampoline_ptr.add(0x9c).writeByteArray([ 0xc0, 0x3, 0x5f, 0xd6 ]); // 0x9c:	ret	 
 trampoline_ptr.add(0xa0).writeByteArray([ 0x1f, 0x20, 0x3, 0xd5 ]); // 0xa0:	nop	 
 trampoline_ptr.add(0xa4).writeByteArray([ 0x1f, 0x20, 0x3, 0xd5 ]); // 0xa4:	nop	 
 trampoline_ptr.add(0xa8).writeByteArray([ 0x1f, 0x20, 0x3, 0xd5 ]); // 0xa8:	nop	 
 trampoline_ptr.add(0xac).writeByteArray([ 0x1f, 0x20, 0x3, 0xd5 ]); // 0xac:	nop	 

 
    let origin_bytes = hook_ptr.readByteArray(4);
    if(origin_bytes!=null) trampoline_ptr.add(0x98).writeByteArray(origin_bytes);
    // relocation origin 
    trampoline_ptr.add(0xa0).writePointer(para1)
    trampoline_ptr.add(0xa8).writePointer(hook_fun_ptr)

    {
        let p = hook_ptr;
        Memory.patchCode(p, 4, patchaddr => {
            var cw = new Arm64Writer(patchaddr);
            cw.putBlImm(trampoline_ptr); 
            cw.flush();
        });
    }
    return trampoline_len;
}

let inline_hook_list:{hook_ptr:NativePointer, origin_bytes:ArrayBuffer| null}[] = [ ];

let patchInfos:{[key:string]:{inline_hook:Function}} ={

    'arm64': {
'inline_hook' : putArm64HookPatch,
    },
}

export function restoreAllInlineHooks()
{
    console.log('inline_hook_list', inline_hook_list.length)
    inline_hook_list.forEach(h=>{
        if (h.origin_bytes!=null){
            let p = h.hook_ptr;
            let sz = h.origin_bytes.byteLength;
            Memory.protect(p,sz,'rwx')
            h.hook_ptr.writeByteArray(h.origin_bytes)
            Memory.protect(p,sz,'rwx')
        }
    })
}

export function inlineHookPatch(trampoline_ptr:NativePointer, hook_ptr:NativePointer, hook_fun_ptr:NativePointer, para1:NativePointer):number
{
    let arch = Process.arch;
    let fun = patchInfos[arch].inline_hook;
    inline_hook_list.push({
        hook_ptr: hook_ptr,
        origin_bytes : hook_ptr.readByteArray(4),
    })
    return fun(trampoline_ptr, hook_ptr, hook_fun_ptr, para1);
}

