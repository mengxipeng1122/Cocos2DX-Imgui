

#include <map>
#include <string>
#include "utils.h"
#include "cocos2dx.h"
#include "imgui.h"
#include "imgui_impl_android.h"
#include "imgui_impl_opengl3.h"

static void imguiInit(int width, int height)
{
    IMGUI_CHECKVERSION();
    ImGui::CreateContext();
    ImGuiIO& io = ImGui::GetIO();

    // Disable loading/saving of .ini file from disk.
    // FIXME: Consider using LoadIniSettingsFromMemory() / SaveIniSettingsToMemory() to save in appropriate location for Android.
    io.IniFilename = NULL;

    // Setup Dear ImGui style
    ImGui::StyleColorsDark();
    //ImGui::StyleColorsClassic();

    // Setup Platform/Renderer backends
    ImGui_ImplAndroid_Init(width, height);
    ImGui_ImplOpenGL3_Init("#version 100");

    // Load Fonts
    // - If no fonts are loaded, dear imgui will use the default font. You can also load multiple fonts and use ImGui::PushFont()/PopFont() to select them.
    // - If the file cannot be loaded, the function will return NULL. Please handle those errors in your application (e.g. use an assertion, or display an error and quit).
    // - The fonts will be rasterized at a given size (w/ oversampling) and stored into a texture when calling ImFontAtlas::Build()/GetTexDataAsXXXX(), which ImGui_ImplXXXX_NewFrame below will call.
    // - Read 'docs/FONTS.md' for more instructions and details.
    // - Remember that in C/C++ if you want to include a backslash \ in a string literal you need to write a double backslash \\ !
    // - Android: The TTF files have to be placed into the assets/ directory (android/app/src/main/assets), we use our GetAssetData() helper to retrieve them.

    // We load the default font with increased size to improve readability on many devices with "high" DPI.
    // FIXME: Put some effort into DPI awareness.
    // Important: when calling AddFontFromMemoryTTF(), ownership of font_data is transfered by Dear ImGui by default (deleted is handled by Dear ImGui), unless we set FontDataOwnedByAtlas=false in ImFontConfig
    ImFontConfig font_cfg;
    font_cfg.SizePixels = 22.0f;
    io.Fonts->AddFontDefault(&font_cfg);
    //void* font_data;
    //int font_data_size;
    //ImFont* font;
    //font_data_size = GetAssetData("Roboto-Medium.ttf", &font_data);
    //font = io.Fonts->AddFontFromMemoryTTF(font_data, font_data_size, 16.0f);
    //IM_ASSERT(font != NULL);
    //font_data_size = GetAssetData("Cousine-Regular.ttf", &font_data);
    //font = io.Fonts->AddFontFromMemoryTTF(font_data, font_data_size, 15.0f);
    //IM_ASSERT(font != NULL);
    //font_data_size = GetAssetData("DroidSans.ttf", &font_data);
    //font = io.Fonts->AddFontFromMemoryTTF(font_data, font_data_size, 16.0f);
    //IM_ASSERT(font != NULL);
    //font_data_size = GetAssetData("ProggyTiny.ttf", &font_data);
    //font = io.Fonts->AddFontFromMemoryTTF(font_data, font_data_size, 10.0f);
    //IM_ASSERT(font != NULL);
    //font_data_size = GetAssetData("ArialUni.ttf", &font_data);
    //font = io.Fonts->AddFontFromMemoryTTF(font_data, font_data_size, 18.0f, NULL, io.Fonts->GetGlyphRangesJapanese());
    //IM_ASSERT(font != NULL);

    // Arbitrary scale-up
    // FIXME: Put some effort into DPI awareness
    ImGui::GetStyle().ScaleAllSizes(3.0f);

}

extern "C"  int init(unsigned char* baseaddress)
{
    LOG_INFOS("hello world from jni %p", baseaddress);
    auto* pApplication = cocos2d::Application::getInstance(); LOG_INFOS(" pApplication %p",  pApplication);
    auto& version = pApplication->getVersion(); LOG_INFOS(" version %s", version.c_str());

    auto* pDirector = cocos2d::Director::getInstance(); LOG_INFOS(" pDirector %p", pDirector);
    auto  size = pDirector->getVisibleSize(); LOG_INFOS(" %f %f", size.width, size.height);
    auto* pScene = pDirector->getRunningScene();LOG_INFOS(" pScene %p", pScene);
    showNodeInfo(pScene);

    int width = size.width;
    int height= size.height;
    imguiInit(width, height);
    
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

static void createNodeTreeInImGui(cocos2d::Node* pnode)
{
    if(pnode!=nullptr){
        ImGui::SetNextItemOpen(true, ImGuiCond_Once);
        char info[PATH_MAX];
        sprintf(info, "%p:%s", pnode, getClassName(pnode));
        if (ImGui::TreeNode(info)) {
            auto childrenCount = pnode->getChildrenCount(); 
            if(childrenCount>0) {
                for(auto & c : pnode->getChildren()) {
                    createNodeTreeInImGui(c);
                }
            }
            ImGui::TreePop();
        }
    }
}

extern "C" int hook_eglSwapBuffers(unsigned char* baseaddress) 
{
    auto* pDirector = cocos2d::Director::getInstance(); 
    auto isPaused = pDirector->isPaused();
    if(isPaused){
        ImGuiIO& io = ImGui::GetIO();
        ImGui_ImplOpenGL3_NewFrame();
        ImGui_ImplAndroid_NewFrame();
        ImGui::NewFrame();
        {
            ImGui::Begin("Node viewer"); 
            {
                auto* pDirector = cocos2d::Director::getInstance(); 
                auto* pScene = pDirector->getRunningScene();
                createNodeTreeInImGui(pScene);
            }

            ImGui::End();
        }

        ImGui::Render();
        ImGui_ImplOpenGL3_RenderDrawData(ImGui::GetDrawData());
    }
    return 0;
}
