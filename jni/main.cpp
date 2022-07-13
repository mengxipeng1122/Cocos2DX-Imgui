

#include <map>
#include <string>
#include "utils.h"
#include "cocos2dx.h"

extern "C"  int init(unsigned char* baseaddress)
{
    LOG_INFOS("hello world from jni %p", baseaddress);
    auto* pApplication = cocos2d::Application::getInstance(); LOG_INFOS(" pApplication %p",  pApplication);
    auto& version = pApplication->getVersion(); LOG_INFOS(" version %s", version.c_str());

    auto* pDirector = cocos2d::Director::getInstance(); LOG_INFOS(" pDirector %p", pDirector);
    auto  size = pDirector->getVisibleSize(); LOG_INFOS(" %f %f", size.width, size.height);
    auto* pScene = pDirector->getRunningScene();LOG_INFOS(" pScene %p", pScene);
    showNodeInfo(pScene);
    
    return 0;
}

static void toggleMenu(unsigned char* baseaddress)
{
    auto* pDirector = cocos2d::Director::getInstance(); 
    auto isPaused = pDirector->isPaused();
    if(isPaused) {
        pDirector->resume();
    }
    else {
        pDirector->pause();
    }
}

static std::map<int, std::string> keyCodeMap = {
    {19, "up"       },
    {20, "down"     },
    {21, "left"     },
    {22, "right"    },
    {104,"start"    },
    {105,"select"   },
    {96, "A"        },
    {97, "B"        },
    {99, "C"        },
    {98, "D"        },
    {100,"E"        },
    {101,"F"        },
};
static std::map<std::string, std::function<int(unsigned char*, bool)>> keyHandlers = {
    {"up"       ,[=](unsigned char* baseaddress, bool isPressed){return 0;}},
    {"down"     ,[=](unsigned char* baseaddress, bool isPressed){return 0;}},
    {"left"     ,[=](unsigned char* baseaddress, bool isPressed){return 0;}},
    {"right"    ,[=](unsigned char* baseaddress, bool isPressed){return 0;}},
    {"start"    ,[=](unsigned char* baseaddress, bool isPressed){return 0;}},
    {"select"   ,[=](unsigned char* baseaddress, bool isPressed){return 0;}},
    {"A"        ,[=](unsigned char* baseaddress, bool isPressed){return 0;}},
    {"B"        ,[=](unsigned char* baseaddress, bool isPressed){return 0;}},
    {"C"        ,[=](unsigned char* baseaddress, bool isPressed){
        if(isPressed) toggleMenu(baseaddress);
        return 0;
    }},
    {"D"        ,[=](unsigned char* baseaddress, bool isPressed){return 0;}},
    {"E"        ,[=](unsigned char* baseaddress, bool isPressed){return 0;}},
    {"F"        ,[=](unsigned char* baseaddress, bool isPressed){return 0;}},
};
extern "C" int handle_keycode(unsigned char* baseaddress, int keyCode, bool isPressed)
{
    LOG_INFOS(" handleKey %d %d", keyCode, isPressed);
    auto it1 = keyCodeMap.find(keyCode);
    if(it1!=keyCodeMap.end()){
        auto key = keyCodeMap[keyCode];
        auto it2 = keyHandlers.find(key);
        if(it2!=keyHandlers.end()) {
            auto fn = keyHandlers[key];
            fn(baseaddress, isPressed);
        }
    }
    return 0;
}

