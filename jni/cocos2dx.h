
#pragma once 

#include <functional>
#include <string>
#include <vector>
namespace cocos2d
{
    struct Application
    {
        static Application* getInstance();
        const std::string getVersion();
    };
    struct Size
    {
        float width;
        float height;
        unsigned char _padding [16];
    };
    struct Vec2
    {
        float x;
        float y;
        unsigned char _padding [16];
    };
    struct Rect
    {
        Vec2 origin;
        Size size;
    };
    struct Node
    {
        const Vec2& getPosition() const;
        const Size& getContentSize() const;
        const Vec2& getAnchorPoint() const;
        Rect getBoundingBox() const;
        bool isVisible() const;
        std::vector<Node*>& getChildren();
        ssize_t getChildrenCount() const;
    };
    struct Label : public Node
    {
        const std::string& getString() const;
    };
    struct Scene : public Node
    {
    };
    struct Director
    {
        auto* getRunningScene(){
            auto* pthiz = (unsigned char*)this;

#ifdef ARM64_V8A
            return *(Scene**)&pthiz[0x180];
#elif defined(ARMEABI_V7A )
            return *(Scene**)&pthiz[0xD0];
#else
    //TODO
#error "please implements other atchitecture"
#endif
        }
        auto isPaused(){
            auto* pthiz = (unsigned char*)this;
#ifdef ARM64_V8A
            return *(bool*)&pthiz[0x170];
#elif defined(ARMEABI_V7A )
            return *(bool*)&pthiz[0xC4];
#else
//TODO
#error "please implements other atchitecture"
#endif
        }
        static Director* getInstance();
        Size getVisibleSize() const;
        void pause();
        void resume();
    };
};


void showNodeInfo(cocos2d::Node* pnode, int indent=0, bool recursive=true);
cocos2d::Node* findChildrenNode(cocos2d::Node* pnode, const char* clz_name,  std::function<bool(cocos2d::Node* pnode)> fn = [=](cocos2d::Node* pnode){return true;}, bool recursive=true);

