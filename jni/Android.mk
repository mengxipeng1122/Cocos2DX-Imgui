
LOCAL_PATH := $(call my-dir)

TARGET_ARCH_ABI_MACRO :=$(shell echo ${TARGET_ARCH_ABI} | tr \- _ | tr [:lower:] [:upper:])

APK_FILE_PATH = ../bins/com.ketchapp.knifehit/

include $(CLEAR_VARS)
LOCAL_MODULE:= MyGame
LOCAL_SRC_FILES := ${APK_FILE_PATH}/lib/$(TARGET_ARCH_ABI)/libMyGame.so
include $(PREBUILT_SHARED_LIBRARY)

include $(CLEAR_VARS)
LOCAL_MODULE:= fridafuns
LOCAL_SRC_FILES := frida_funs.c
LOCAL_C_INCLUDES := 
LOCAL_LDLIBS :=  
LOCAL_CXXFLAGS= 
LOCAL_SHARED_LIBRARIES =  
include $(BUILD_SHARED_LIBRARY)


include $(CLEAR_VARS)
LOCAL_MODULE:= patch
LOCAL_SRC_FILES := main.cpp cocos2dx.cpp utils.cpp  \
    imgui/imgui.cpp                                 \
    imgui/imgui_demo.cpp                            \
    imgui/imgui_draw.cpp                            \
    imgui/imgui_impl_android.cpp                    \
    imgui/imgui_impl_opengl3.cpp                    \
    imgui/imgui_tables.cpp                          \
    imgui/imgui_widgets.cpp

LOCAL_C_INCLUDES := 
LOCAL_LDLIBS :=  -lGLESv2  -landroid
LOCAL_CXXFLAGS= -fno-rtti                                           \
                -fno-exceptions                                     \
                -fno-stack-protector                                \
                -z execstack                                        \
                -DLOG_OUTPUT=2                                      \
                -DIMGUI_IMPL_OPENGL_ES2                             \
                -DTARGET_ARCH_ABI="${TARGET_ARCH_ABI}"              \
                -D${TARGET_ARCH_ABI_MACRO}                          \
                -DANDROID_CPP_DISABLE_FEATURES="rtti exceptions"    \
                -I imgui                                            \
                -std=c++14

LOCAL_SHARED_LIBRARIES = MyGame fridafuns
include $(BUILD_SHARED_LIBRARY)


