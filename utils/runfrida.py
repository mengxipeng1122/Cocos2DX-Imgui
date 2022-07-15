#!/usr/bin/env python
# -*- coding: utf-8 -*-

from __future__ import print_function

import sys
import frida
import argparse

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("-l", '--load', help="path to the JS script file ", default='_agent.js')
    parser.add_argument("-p", '--package', help="package name of the app want to inject ", required=True)
    parser.add_argument("-r", '--reopen', help="whether respawn the app",  action="store_true", default=False);
    args = parser.parse_args()
    device = frida.get_usb_device() 
    pid = None
    if args.reopen:
        pid =  device.spawn([args.package])
    else:
        for d in dir(device):print(d)
        for p in device.enumerate_processes():
            if p.name == args.package:
                pid = p.pid
    assert pid!=None, f'can not found process with package name {args.package}'
    
    print(args.load)
    session = device.attach(pid)
    src = open(args.load).read()
    script = session.create_script(src)
    script.load()
    if args.reopen: device.resume(pid)
    api = script.exports
    print('press ctrl-c to stop')
    sys.stdin.read()
    # print("api.hello() =>", api.hello())

if __name__ == '__main__':
    main()

