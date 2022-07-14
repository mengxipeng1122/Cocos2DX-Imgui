
ANDROID_ABI=`adb shell getprop ro.product.cpu.abi`
ANDROID_DEVNAME=$(shell adb shell getprop ro.product.vendor.name)

NDKPATH ?= /mnt/axly/Tools/android-ndk/android-ndk-r11c/

build:
	${NDKPATH}/ndk-build  V=1

clean:
	${NDKPATH}/ndk-build clean 

install:build
	adb push ../libs/${ANDROID_ABI}/libpatch.so /data/local/tmp

