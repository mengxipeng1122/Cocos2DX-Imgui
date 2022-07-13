
ANDROID_ABI=`adb shell getprop ro.product.cpu.abi`
ANDROID_DEVNAME=$(shell adb shell getprop ro.product.vendor.name)
PACKAGE_NAME=com.ketchapp.knifehit


build:
	(cd jni; make install);
	./utils/so2tsmodule.py --no-content libs/${ANDROID_ABI}/libpatch.so -o patchso.ts
	npm run build

run:
	frida -U -f ${PACKAGE_NAME} -l _agent.js --no-pause
	

