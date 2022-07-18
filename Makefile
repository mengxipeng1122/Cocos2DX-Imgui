
ANDROID_ABI=`adb shell getprop ro.product.cpu.abi`
ANDROID_DEVNAME=$(shell adb shell getprop ro.product.vendor.name)
PACKAGE_NAME=com.ketchapp.knifehit
SO_NAME=libMyGame.so

all: build_ts

build_jni:
	(cd jni; make install);

generate_patchso_ts: build_jni
	./utils/so2tsmodule.py --no-content libs/${ANDROID_ABI}/libpatch.so -o patchso.ts

generate_so_ts:
	./utils/so2tsmodule.py --no-content --no-exports --no-relocations bins/${PACKAGE_NAME}/lib/${ANDROID_ABI}/${SO_NAME} -o so.ts

build_ts: build_jni generate_patchso_ts
	npm run build

run: build_ts
	frida -U -f ${PACKAGE_NAME} -l _agent.js --no-pause
	#frida -U -f ${PACKAGE_NAME} -l tt.js --no-pause

    
	

