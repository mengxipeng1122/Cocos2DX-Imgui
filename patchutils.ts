
'use strict';


import { get } from "https";
import { connected } from "process";
import { showAsmCode, dumpMemory } from "./fridautils";

function getPyCodeFromMemory(p:NativePointer, sz:number):string{
    let pycode = "";
    pycode += `(${p}, [`
    let bs = p.readByteArray(sz)
    if(bs==null) throw `can not read at ${sz}`
    pycode += new Uint8Array(bs).join(',')
    pycode += ']), '
    console.log(pycode)
    return pycode;
}

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

export function putThumbHookPatch(trampoline_ptr:NativePointer, hook_ptr:NativePointer, hook_fun_ptr:NativePointer, para1:NativePointer):number[]
{
    if(Process.arch!='arm' || hook_ptr.and(1).compare(1)!=0) throw(" please check archtecutre , should be and thumb function")
    let canBranchDirectlyBetween = (from:NativePointer, to:NativePointer):boolean =>{
        let distance = to.sub(from).toInt32();
        return distance >=-8388608 && distance<= 8388607;
    }

    let use_long_jump_at_hook_ptr = !(canBranchDirectlyBetween(hook_ptr, trampoline_ptr));
    let origin_inst_len = use_long_jump_at_hook_ptr?0x08:0x04;

    let trampoline_len = 0x30;
    Memory.patchCode(trampoline_ptr, trampoline_len, code => {
    {
        let offset = 0;
        {
            const writer = new ThumbWriter(code);
            writer.putPushRegs([ 'r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', ])
            writer.putPushRegs(['r8', 'sb', 'sl', 'fp', 'ip', 'lr'] )
            writer.putMrsRegReg('r0','apsr-nzcvq')
            writer.putPushRegs([ 'r0'])
            writer.putNop();
            writer.putMovRegReg('r1', 'sp')
            writer.putLdrRegRegOffset('r0','pc',0x14)
            writer.putLdrRegRegOffset('r4','pc',0x18)
            writer.putBlxReg('r4')
            writer.putPopRegs(['r0'])
            writer.putMsrRegReg('apsr-nzcvq','r0')
            writer.putPopRegs(['r8', 'sb', 'sl', 'fp', 'ip', 'lr'] )
            writer.putPopRegs([ 'r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', ])
            console.log('offset', writer.offset)
            dumpMemory(code.add(offset), writer.offset-offset)
            //showAsmCode(code.add(offset), writer.offset-offset, ArmInstruction.parse)
        }
        {
            // put origin inst
            console.log('origin inst', ptr(offset))
            let padding_sz = 0x8;
            let cnt = 0;
            for(let t = offset;t < offset+padding_sz && cnt<5;cnt++)
            {
                let src_ptr = hook_ptr.add(t-offset).add(~1)
                let tag_ptr = code.add(t)
                console.log(src_ptr,'=>', tag_ptr)
                if(t-offset<origin_inst_len){
                    // move origin instructions
                    let inst = Instruction.parse(src_ptr) as ArmInstruction;
                    console.log(JSON.stringify(inst))
                    if(inst.mnemonic=='bl'){
                        console.log('fix thumb bl')
                        const op0 = inst.operands[0]
                        if(op0.type =='imm'){
                            let imm = op0.value.valueOf();
                            let writer = new ThumbWriter(tag_ptr);
                            writer.putBlImm(ptr(imm))
                            writer.flush();
                        }
                        else{
                            throw `now handled bl instrution ${JSON.stringify(Instruction)}`
                        }
                    }
                    else{
                        const inst_bytes = src_ptr.readByteArray(inst.size)
                        if(inst_bytes!=null){
                            tag_ptr.writeByteArray(inst_bytes)
                        }
                    }
                    t+= inst.size;
                }
                else{ 
                    // write nop
                    let writer = new ThumbWriter(tag_ptr);
                    writer.putNop()
                    writer.flush();
                    t+=writer.offset;
                }
            }
            offset += padding_sz;
        }
        

    }});
    //console.log(trampoline_ptr)
//trampoline_ptr.add(0x0).writeByteArray([ 0xff, 0xb4 ]); // 0x0:	push	{r0, r1, r2, r3, r4, r5, r6, r7}
//trampoline_ptr.add(0x2).writeByteArray([ 0x2d, 0xe9, 0x0, 0x5f ]); // 0x2:	push.w	{r8, sb, sl, fp, ip, lr}
//trampoline_ptr.add(0x6).writeByteArray([ 0xef, 0xf3, 0x0, 0x80 ]); // 0x6:	mrs	r0, apsr
//trampoline_ptr.add(0xa).writeByteArray([ 0x1, 0xb4 ]); // 0xa:	push	{r0}
//trampoline_ptr.add(0xc).writeByteArray([ 0x0, 0xbf ]); // 0xc:	nop
//trampoline_ptr.add(0xe).writeByteArray([ 0x69, 0x46 ]); // 0xe:	mov	r1, sp
//trampoline_ptr.add(0x10).writeByteArray([ 0x5, 0x48 ]); // 0x10:	ldr	r0, [pc, #0x14]
//trampoline_ptr.add(0x12).writeByteArray([ 0x6, 0x4c ]); // 0x12:	ldr	r4, [pc, #0x18]
//trampoline_ptr.add(0x14).writeByteArray([ 0xa0, 0x47 ]); // 0x14:	blx	r4
//trampoline_ptr.add(0x16).writeByteArray([ 0x1, 0xbc ]); // 0x16:	pop	{r0}
//trampoline_ptr.add(0x18).writeByteArray([ 0x80, 0xf3, 0x0, 0x89 ]); // 0x18:	msr	cpsr_fc, r0
//trampoline_ptr.add(0x1c).writeByteArray([ 0xbd, 0xe8, 0x0, 0x5f ]); // 0x1c:	pop.w	{r8, sb, sl, fp, ip, lr}
//trampoline_ptr.add(0x20).writeByteArray([ 0xff, 0xbc ]); // 0x20:	pop	{r0, r1, r2, r3, r4, r5, r6, r7}
//trampoline_ptr.add(0x22).writeByteArray([ 0x0, 0xbf ]); // 0x22:	nop
//trampoline_ptr.add(0x24).writeByteArray([ 0x0, 0xbf ]); // 0x24:	nop
//trampoline_ptr.add(0x26).writeByteArray([ 0x70, 0x47 ]); // 0x26:	bx	lr
//trampoline_ptr.add(0x28).writeByteArray([ 0x0, 0xbf ]); // 0x28:	nop
//trampoline_ptr.add(0x2a).writeByteArray([ 0x0, 0xbf ]); // 0x2a:	nop
//trampoline_ptr.add(0x2c).writeByteArray([ 0x0, 0xbf ]); // 0x2c:	nop
//trampoline_ptr.add(0x2e).writeByteArray([ 0x0, 0xbf ]); // 0x2e:	nop
//
//    if(origin_inst!=undefined) trampoline_ptr.add(0x22).writeByteArray(origin_inst);
//    trampoline_ptr.add(0x28).writePointer(para1)
//    trampoline_ptr.add(0x2c).writePointer(hook_fun_ptr)
//    {
//        let p = ptr((hook_ptr.toUInt32() & (~1))>>>0);
//        Memory.patchCode(p, 4, patchaddr => {
//            var cw = new ThumbWriter(patchaddr);
//            cw.putBlImm(trampoline_ptr) 
//            cw.flush();
//        });
//    }
    return [ trampoline_len, origin_inst_len];
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


export function putArm64HookPatch(trampoline_ptr:NativePointer, hook_ptr:NativePointer, hook_fun_ptr:NativePointer, para1:NativePointer):number[]
{
    if(Process.arch!='arm64') throw(" please check archtecutre , should be arm64")
    const store_q_registers = false;
    let trampoline_len = store_q_registers? 0x148 : 0xc8;

    let use_long_jump_at_hook_ptr = !(new Arm64Writer(trampoline_ptr).canBranchDirectlyBetween(hook_ptr, trampoline_ptr));
    let origin_inst_len = use_long_jump_at_hook_ptr?0x10:0x04;

    Memory.patchCode(trampoline_ptr, trampoline_len, code => {
    {
        let offset = 0;
        {
            const writer = new Arm64Writer(code);
            writer.putPushAllXRegisters();              
            if(store_q_registers){
                writer.putPushAllQRegisters();
            }
            writer.putMovRegReg('x1','sp');             
            if(store_q_registers){
                writer.putBytes([ 0x80, 0x05, 0x00, 0x58]);  // 0x88: ldr  x0, trampoline_ptr.add(0x138)
                writer.putBytes([ 0xa9, 0x05, 0x00, 0x58]);  // 0x8c: ldr  x9, trampoline_ptr.add(0x140)
            }
            else{
                writer.putBytes([ 0x80, 0x03, 0x00, 0x58]);  // 0x48: ldr  x0, trampoline_ptr.add(0xb8)
                writer.putBytes([ 0xa9, 0x03, 0x00, 0x58]);  // 0x4c: ldr  x9, trampoline_ptr.add(0xc0)
            }
            writer.putBlrReg('x9');                     
            if(store_q_registers){
                writer.putPopAllQRegisters();
            }
            writer.putPopAllXRegisters();               
            writer.flush();
            offset = writer.offset;
        }
        {
            // put origin inst
            console.log('origin inst', ptr(offset))
            let padding_sz = 0x10;
            let cnt = 0;
            for(let t = offset;t < offset+padding_sz && cnt<5;cnt++)
            {
                let src_ptr = hook_ptr.add(t-offset)
                let tag_ptr = code.add(t)
                console.log(src_ptr,'=>', tag_ptr)
                if(t-offset<origin_inst_len){
                    // move origin instructions
                    let inst = Instruction.parse(src_ptr) as Arm64Instruction;
                    console.log(JSON.stringify(inst))
                    if(inst.mnemonic=='bl'){
                        console.log('fix arm64 bl')
                        const op0 = inst.operands[0]
                        if(op0.type =='imm'){
                            let imm = op0.value.toNumber();
                            let writer = new Arm64Writer(tag_ptr);
                            writer.putBlImm(ptr(imm))
                            writer.flush();
                        }
                        else{
                            throw `now handled bl instrution ${JSON.stringify(Instruction)}`
                        }
                    }
                    else if(inst.mnemonic=='adrp'){
                        console.log('fix arm64 adrp')
                        const op0 = inst.operands[0]
                        const op1 = inst.operands[1]
                        if(op0.type == 'reg' && op1.type =='imm'){
                            let reg = op0.value.toString() as Arm64Register;
                            let imm = op1.value.toNumber();
                            let writer = new Arm64Writer(tag_ptr);
                            writer.putAdrpRegAddress(reg, ptr(imm));
                            writer.flush();
                        }
                        else{
                            throw `now handled bl instrution ${JSON.stringify(Instruction)}`
                        }
                    }
                    else if(inst.mnemonic=='cbz'){
                        console.log('fix arm64 cbz')
                        const op0 = inst.operands[0]
                        const op1 = inst.operands[1]
                        if(op0.type == 'reg' && op1.type =='imm'){
                            let reg = op0.value.toString() as Arm64Register;
                            let imm = op1.value.toNumber();
                            let writer = new Arm64Writer(tag_ptr)
                            // assembly manual 
                            let from = tag_ptr;
                            let to = ptr(imm);
                            if(to.sub(from).compare(0x7ffff)>=0){
                                throw `can not fix arm64 cbz`
                            }
                            let si;
                            let regi = reg[0];
                            if(regi.toLowerCase() == 'x') {
                                si = 0xb4000000;
                            }
                            else if(regi.toLowerCase() == 'w') {
                                si = 0x34000000;
                            }
                            else{
                                throw `unhandled si of reg ${reg}`
                            }
                            let distance = to.sub(from).shr(2).and(0x7ffff).shl(5);
                            let regidx = parseInt( reg.substring(1), 10);
                            let myinst = ptr(si).or ( distance).or( regidx & 0x1f);
                            console.log(myinst)
                            writer.putInstruction(myinst.toUInt32());
                            writer.flush();
                        }
                        else{
                            throw `now handled bl instrution ${JSON.stringify(Instruction)}`
                        }
                    }
                    else{
                        const inst_bytes = src_ptr.readByteArray(inst.size)
                        if(inst_bytes!=null){
                            tag_ptr.writeByteArray(inst_bytes)
                        }
                    }
                    t+= inst.size;
                }
                else{ 
                    // write nop
                    let writer = new Arm64Writer(tag_ptr);
                    writer.putNop()
                    writer.flush();
                    t+=writer.offset;
                }
            }
            offset += padding_sz;
        }
        {
            // long jump
            // 0x0:	ldr	x16, #8
            // 0x4:	br	x16

            // write return instruction 
            let writer = new Arm64Writer(code.add(offset));
            let b_back_ptr = hook_ptr.add(origin_inst_len);
            let use_long_jump_at_b_back = !(writer.canBranchDirectlyBetween(code.add(offset), b_back_ptr));
            if(use_long_jump_at_b_back){
                writer.putBytes([ 0x50, 0x00, 0x00, 0x58]);  // ldr	x16, #8
                writer.putBrReg('x16');
                writer.flush();
                offset += writer.offset;
                code.add(offset).writePointer(b_back_ptr);
                offset += Process.pointerSize;
            }
            else{
                writer.putBImm(b_back_ptr);
                writer.putNop();
                writer.putNop();
                writer.putNop();
                writer.flush();
                offset += writer.offset;
            }
        }
        {
            console.log('para1', ptr(offset))
            // write parameter 1 
            code.add(offset).writePointer(para1); offset += Process.pointerSize;
        }
        {
            console.log('hook_fun_ptr', ptr(offset))
            // write hook_fun_ptr
            code.add(offset).writePointer(hook_fun_ptr); offset += Process.pointerSize;
        }
        {
            // dump contents
            let p = code;
            let sz= offset; console.log('offset', ptr(offset))
            dumpMemory(p, sz)
            showAsmCode(p, sz-Process.pointerSize*2); // skip last 2 address
        }
    }})
    {
        // fix hook_ptr
        let p = hook_ptr;
        Memory.patchCode(p, 4, patchaddr => {
            var cw = new Arm64Writer(patchaddr);
            cw.putBImm(trampoline_ptr); 
            cw.flush();
        });
    }
    return [ trampoline_len, origin_inst_len];
}

export abstract class InlineHooker
{
    hook_fun_ptr        : NativePointer;
    trampoline_ptr      : NativePointer;
    hook_ptr            : NativePointer;
    para1               : NativePointer;
    constructor(hook_ptr:NativePointer, trampoline_ptr:NativePointer, hook_fun_ptr:NativePointer, para1:NativePointer){
        this.hook_ptr       = hook_ptr;
        this.trampoline_ptr = trampoline_ptr;
        this.hook_fun_ptr   = hook_fun_ptr;
        this.para1          = para1;
    }

    static max_code_cnt= 5;
    static max_trampoline_len = 0x200;

    putPrecode(p:NativePointer):number {
        throw `please implement putPrecode function ${JSON.stringify(this)}`
    }

    relocCode(from:NativePointer, to:NativePointer, sz:number):[number, ArrayBuffer] {
        throw `please implement relocCode function ${this}`
    }

    putJumpCode(from:NativePointer, to:NativePointer):number {
        throw `please implement putJumpCode function ${this}`
    }

    canBranchDirectlyBetween(from:NativePointer, to:NativePointer):boolean {
        throw `please implement canBranchDirectlyBetween function ${this}`
    }

    getJumpInstLen(from:NativePointer, to:NativePointer):number{
        throw `please implement getJumpInstLen function ${this}`
    }

    run():[number, ArrayBuffer]{
        let origin_bytes:ArrayBuffer=new ArrayBuffer(0)
        let offset = 0;
        let relocsz=0;
        let trampolineCodeAddr = ptr(0);
        // write trampoline code 
        Memory.patchCode(this.trampoline_ptr, InlineHooker.max_trampoline_len, code=>{
            let sz;
            // write hook_fun_ptr
            code.add(offset).writePointer(this.hook_fun_ptr); offset += Process.pointerSize;
            // write arg1
            code.add(offset).writePointer(this.para1); offset += Process.pointerSize;
            // write precode
            trampolineCodeAddr = code.add(offset);
            sz = this.putPrecode(code.add(offset)); offset += sz;
            // relocate code 
            relocsz = this.getJumpInstLen(this.hook_ptr, trampolineCodeAddr);
            [sz, origin_bytes] = this.relocCode(this.hook_ptr, code.add(offset), relocsz); offset += sz;
            // write jump back code 
            let origin_inst_len = origin_bytes.byteLength;
            sz = this.putJumpCode(code.add(offset), this.hook_ptr.add(origin_inst_len)); offset += sz;

            // show code 
            dumpMemory(code, offset)
            getPyCodeFromMemory(code, offset)
        });  
        // write jump code at hook_ptr
        let jumpsz = this.getJumpInstLen(this.hook_ptr, trampolineCodeAddr);
        let bs = this.hook_ptr.readByteArray(jumpsz);
        if(bs==null) throw `can not read byte at ${this.hook_ptr}`
        origin_bytes = bs;
        Memory.patchCode(this.hook_ptr, jumpsz, code=>{
            let sz = this.putJumpCode(code, trampolineCodeAddr)
            dumpMemory(code, sz);
            getPyCodeFromMemory(code, sz)
        })
        console.log('trampolineCodeAddr', trampolineCodeAddr)
        console.log('hook_fun_ptr', this.hook_fun_ptr);
        console.log('origin_bytes', origin_bytes)
        return [offset, origin_bytes];
    }

    static inlineHookerFactory(hook_ptr:NativePointer, trampoline_ptr:NativePointer, hook_fun_ptr:NativePointer, para1: NativePointer){
        let arch = Process.arch;
        if(arch == 'arm') {
            if(hook_ptr.and(1).equals(1)){
                return new ThumbInlineHooker(hook_ptr, trampoline_ptr,hook_fun_ptr, para1)
            }
            else {
                return new ArmInlineHooker(hook_ptr, trampoline_ptr,hook_fun_ptr, para1)
            }
        }
        else if(arch == 'arm64'){
            return new Arm64InlineHooker(hook_ptr, trampoline_ptr,hook_fun_ptr, para1)
        }
        else{
            throw `unhandle architecture ${arch}`
        }
    }

}

class ThumbInlineHooker extends InlineHooker{

    constructor(hook_ptr:NativePointer, trampoline_ptr:NativePointer, hook_fun_ptr:NativePointer, para1:NativePointer){
        super(hook_ptr.and(~1), trampoline_ptr, hook_fun_ptr,para1)
    }

    putPrecode(p:NativePointer):number {
        const writer = new ThumbWriter(p);
        writer.putPushRegs([ 'r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', ])
        writer.putPushRegs(['r8', 'sb', 'sl', 'fp', 'ip', 'lr'] )
        writer.putMrsRegReg('r0','apsr-nzcvq')
        writer.putPushRegs([ 'r0'])
        writer.putNop();
        writer.putMovRegReg('r1', 'sp')
        writer.putBytes([ 0x5F, 0xF8, 0x18, 0x00]) // ldr.w	r0, [pc, #-0x18]
        writer.putBytes([ 0x5F, 0xF8, 0x20, 0x40]) // ldr.w	r4, [pc, #-0x20]
        writer.putBlxReg('r4')
        writer.putPopRegs(['r0'])
        writer.putMsrRegReg('apsr-nzcvq','r0')
        writer.putPopRegs(['r8', 'sb', 'sl', 'fp', 'ip', 'lr'] )
        writer.putPopRegs([ 'r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7' ])
        writer.flush();
        return writer.offset;
    }

    relocCode(from:NativePointer, to:NativePointer, sz:number):[number, ArrayBuffer] {
        console.log('relocCode sz', sz, from, '=>', to);
        let offset = 0;
        let code = to.and(~1);
        const writer = new ThumbWriter(code);
        const relocator = new ThumbRelocator(from, writer)
        for(let c=0;c<InlineHooker.max_code_cnt; c++){
            dumpMemory(to.add(offset), 0x10)
            dumpMemory(from.add(offset), 0x10)
            offset = relocator.readOne(); 
            let inst = relocator.input;
            console.log(offset, 'inst', JSON.stringify(inst))
            relocator.writeOne();
            if(offset>=sz) break;
        }
        writer.flush();
        let origin_bytes = from.readByteArray(offset);
        if(origin_bytes==null) throw `can not read origin byte at ${from}`
        return [writer.offset, origin_bytes]
    }

    canBranchDirectlyBetween(from:NativePointer, to:NativePointer):boolean {
        let distance = to.or(1).sub(from.or(1)).toInt32();
        console.log('from', from)
        console.log('to', to)
        console.log('distance', distance);
        return distance >=-8388608 && distance<= 8388607;
    }

    getJumpInstLen(from:NativePointer, to:NativePointer):number{
        if(this.canBranchDirectlyBetween(from, to)) return 4;
        else return 8;
    }

    putJumpCode(from:NativePointer, to:NativePointer):number {
        let code = from.and(~1);
        const writer = new ThumbWriter(code);
        if(this.canBranchDirectlyBetween(from,to)){
            writer.putBImm(to.or(1))
            writer.flush();
            return writer.offset;
        }
        else{
            console.log(from,'=>', to.or(1))
            if(code.and(0x3).equals(0)) {
                writer.putLdrRegRegOffset('pc','pc',0)
            }
            else{
                writer.putLdrRegRegOffset('pc','pc',2)
            }
            writer.flush()
            from.add(writer.offset).writePointer(to.or(1))
            return writer.offset+Process.pointerSize;
        }
    }

}

class ArmInlineHooker extends InlineHooker{

}

class Arm64InlineHooker extends InlineHooker{

    constructor(hook_ptr:NativePointer, trampoline_ptr:NativePointer, hook_fun_ptr:NativePointer, para1:NativePointer){
        super(hook_ptr, trampoline_ptr, hook_fun_ptr,para1)
    }

    putPrecode(p:NativePointer):number {
        const writer = new Arm64Writer(p);
        writer.putPushAllXRegisters();              
        writer.putMovRegReg('x1','sp');             
        writer.putBytes([ 0x80, 0xfd, 0xff, 0x58]);  // 0x58: ldr  x0, trampoline_ptr.add(0x08)
        writer.putBytes([ 0x29, 0xfd, 0xff, 0x58]);  // 0x5c: ldr  x9, trampoline_ptr.add(0x00)
        writer.putBlrReg('x9');                     
        writer.putPopAllXRegisters();               
        writer.flush();
        return writer.offset;
    }

    relocCode(from:NativePointer, to:NativePointer, sz:number):[number, ArrayBuffer] {
        console.log('relocCode sz', sz, from, '=>', to);
        let offset = 0;
        let code = to.and(~1);
        const writer = new Arm64Writer(code);
        const relocator = new Arm64Relocator(from, writer)
        for(let c=0;c<InlineHooker.max_code_cnt; c++){
            dumpMemory(to.add(offset), 0x10)
            dumpMemory(from.add(offset), 0x10)
            offset = relocator.readOne(); 
            let inst = relocator.input;
            console.log(offset, 'inst', JSON.stringify(inst))
            relocator.writeOne();
            if(offset>=sz) break;
        }
        writer.flush();
        let origin_bytes = from.readByteArray(offset);
        if(origin_bytes==null) throw `can not read origin byte at ${from}`
        return [writer.offset, origin_bytes]
    }

    canBranchDirectlyBetween(from:NativePointer, to:NativePointer):boolean {
        return new Arm64Writer(ptr(0)).canBranchDirectlyBetween(from, to);
    }

    getJumpInstLen(from:NativePointer, to:NativePointer):number{
        if(this.canBranchDirectlyBetween(from, to)) return 4;
        else return 0x10;
    }

    putJumpCode(from:NativePointer, to:NativePointer):number {
        let code = from;
        const writer = new Arm64Writer(code);
        if(this.canBranchDirectlyBetween(from,to)){
            writer.putBImm(to)
            writer.flush();
            return writer.offset;
        }
        else{
            console.log(from,'=>', to)
            writer.putBytes([ 0x50, 0x00, 0x00, 0x58]);  // ldr	x16, #8
            writer.putBrReg('x16');
            writer.flush()
            from.add(writer.offset).writePointer(to)
            return writer.offset+Process.pointerSize;
        }
    }


}

export function inlineHookPatch(trampoline_ptr:NativePointer, hook_ptr:NativePointer, hook_fun_ptr:NativePointer, para1:NativePointer):number
{
    if(hasHooked(hook_ptr)) return 0;

    let inlineHooker = InlineHooker.inlineHookerFactory(hook_ptr, trampoline_ptr, hook_fun_ptr, para1);
    let [trampoline_len, origin_bytes] = inlineHooker.run();
    let k = hook_ptr.toString();
    all_inline_hooks[k]= {
        hook_ptr: hook_fun_ptr,
        origin_bytes : origin_bytes,
    }
    return trampoline_len;
}

export let all_inline_hooks:{[key:string]:{
        origin_bytes:ArrayBuffer| null,
        hook_ptr:NativePointer,
}}= { };

let hasHooked = (hook_ptr:NativePointer):boolean=>{
    return hook_ptr.toString() in all_inline_hooks;
}

export let restoreAllInlineHooks=()=>{
        console.log('all_inline_hooks', Object.keys(all_inline_hooks).length)
        Object.keys(all_inline_hooks)
            .forEach(k=>{
                let v =all_inline_hooks[k]
                if (v.origin_bytes!=null){
                    let bs = v.origin_bytes;
                    let p = v.hook_ptr;
                    let sz = bs.byteLength;
                    Memory.patchCode(p, sz, code=>{
                        code.writeByteArray(bs)
                    })
                }
            })
    }
