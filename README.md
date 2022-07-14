# Cocos2DX-Imgui
This project tries to integrate [imgui](https://github.com/ocornut/imgui.git) into a Cocos2D-x game, and using Frida. 


## Test game info: 
- game name: Knife Hit
- package name: com.ketchapp.knifehit
- link: [apkpure](https://apkpure.com/knife-hit/com.ketchapp.knifehit)

## Build
```bash
git clone https://github.com/mengxipeng1122/Cocos2DX-Imgui.git
cd Cocos2DX-Imgui
mkdir bins
```
Donwload game apk from [apkpure](https://apkpure.com/knife-hit/com.ketchapp.knifehit), I'm using versioni 1.8.12, and save downloaed apk file as `bins/com.ketchapp.knifehit.apk`
```bash
# decompress downloaded apk
cd bins
mkdir com.ketchapp.knifehit
cd com.ketchapp.knifehit
unzip -x ../com.ketchapp.knifehit.apk
cd ../..
# build jni 
cd jni
#set NDK path, or you can modify the variable defination in jni/Makefile
export NDKPATH=<path to your NDK toolchain> # I'm using r11c, laster version may not work, because the NDK version of this game is not very new
make  # 
# generate patchso.ts
cd ..
make generate_patchso_ts
# install npm modules
npm i
# install game to an Android device, and verify frida connect to this device is ok
# and connect a USB joystick and a mouse to the Android device
make run
# this will start game, and inject frida script to game.
```
Press button "C" to popup imgui windows. 
If button "C" is not working, you can modify `keyCodeMap` in the file `jni/main.cpp`, this variable is of type std::map, and key is the keyCode, value is the key name in program. Not every USB joystick's keyCode is same.

Window `Node Navigator` will list all all nodes in current scene. Select one node in this window. Then window `Node info ` will diplay more info of the selected node.

## Screen shot

![screen shot](./assets/screenshot.png?raw=true)

## Note
So far, it can show all nodes in current scene. 
And I am testing with an Android dev board [Odroid-N2](https://www.hardkernel.com/shop/odroid-n2-with-4gbyte-ram-2/), and only tested in arm64. And I use a joystick to play game, button C to toggle node viewer. 

