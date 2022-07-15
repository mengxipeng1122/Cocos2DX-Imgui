
ANDROID_ABI=`adb shell getprop ro.product.cpu.abi`
ANDROID_DEVNAME=$(shell adb shell getprop ro.product.vendor.name)
PACKAGE_NAME=com.ketchapp.knifehit

all: build_ts

build_jni:
	(cd jni; make install);

generate_patchso_ts: build_jni
	./utils/so2tsmodule.py --no-content libs/${ANDROID_ABI}/libpatch.so -o patchso.ts

build_ts: build_jni generate_patchso_ts
	npm run build

run:#build_ts
	#frida -U -f ${PACKAGE_NAME} -l _agent.js --no-pause
	./utils/runfrida.py -r -p ${PACKAGE_NAME} -l _agent.js
    
	

