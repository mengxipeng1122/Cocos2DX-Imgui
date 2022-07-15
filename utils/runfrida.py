#!/usr/bin/env python
# -*- coding: utf-8 -*-

from __future__ import print_function

import sys
import frida
import argparse
from  datetime import  datetime, timedelta #*
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

runner=None

class MyHandler(FileSystemEventHandler):
    def __init__(self):
        super(MyHandler, self).__init__();
        self.last_modified = datetime.now()

    def on_modified(self, event):
        if datetime.now() - self.last_modified < timedelta(seconds=4):
            return
        else:
            self.last_modified = datetime.now()
        #print(f'event type: {event.event_type}  path : {event.src_path}')
        if runner!=None:
            if event.src_path == runner._src_path:
                # print(" reload ")
                runner.reloadScript();

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("-l", '--load', help="path to the JS script file ", default='_agent.js')
    parser.add_argument("-p", '--package', help="package name of the app want to inject ", required=True)
    parser.add_argument("-r", '--reopen', help="whether respawn the app",  action="store_true", default=False);
    args = parser.parse_args()
    src_path = args.load;
    device = frida.get_usb_device() 

    if args.reopen:
        pid =  device.spawn([args.package])
    else:
        for p in device.enumerate_processes():
            if p.name == args.package:
                pid = p.pid
    assert pid!=None, f'can not found process with package name {args.package}'
    
    class Runner:
        def __init__(self, pid, src_path):
            self._script          = None
            self._src_path        = src_path;
            self._pid             = pid;
            #self._session         = device.attach(pid)

        def reloadScript(self):
            if self._script != None:
                if 'unload' in self._script.list_exports(): self._script.exports.unload();
                self._script.unload();
                self._session.detach(); 

            src = open(self._src_path).read()
            self._session  = device.attach(pid)
            script = self._session.create_script(src)
            script.on('message', self._message)
            script.set_log_handler(self._log)
            script.load()
            self._script = script;
            if 'init' in self._script.list_exports(): self._script.exports.init();

        def _on_script_change(self):
            # print("on_script_change");
            self.reloadScript();

        def _log(self, level, text):
            print('log', level, text)

        def _message(self, text, data):
            print('message', text, data)

    global runner
    runner = Runner(pid, src_path)
    runner.reloadScript();

    event_handler = MyHandler()
    observer = Observer()
    observer.schedule(event_handler, path=src_path, recursive=False)
    observer.start()

    if args.reopen: device.resume(pid)
    print('press ctrl-c to stop')
    sys.stdin.read()

if __name__ == '__main__':
    main()

