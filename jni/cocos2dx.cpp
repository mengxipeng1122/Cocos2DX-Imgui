

#include "utils.h"
#include "cocos2dx.h"

void showNodeInfo(cocos2d::Node* pnode, int indent, bool recursive)
{
    char indentStr[PATH_MAX];
    memset(indentStr, 0, PATH_MAX);
    for(auto t=0;t<indent;t++) strcat(indentStr, "  ");
    if(pnode != nullptr) {
        const auto* clzName = getClassName(pnode);      LOG_INFOS("%s%p : %s",              indentStr, pnode, clzName);
        const auto& pos =  pnode->getPosition();        LOG_INFOS("%spos %f %f ",           indentStr, pos.x, pos.y);
        const auto& sz = pnode->getContentSize();       LOG_INFOS("%ssz %f %f ",            indentStr, sz.width, sz.height);
        const auto anchorpt = pnode->getAnchorPoint();  LOG_INFOS("%sahchor pos %f %f ",    indentStr, anchorpt.x, anchorpt.y);
        cocos2d::Rect rect = pnode->getBoundingBox();   LOG_INFOS("%srect %f %f %f %f",     indentStr, rect.origin.x, rect.origin.y, rect.size.height, rect.size.height);
        auto visible = pnode->isVisible();              LOG_INFOS("%svisible %s",           indentStr, visible?"true":"false");
        if(!strcmp(clzName, "N7cocos2d5LabelE")) {
            auto* plabel = (cocos2d::Label*) pnode;
            auto& text = plabel->getString(); LOG_INFOS("%stext %s ", indentStr, text.c_str());
        }
        auto childrenCount = pnode->getChildrenCount(); LOG_INFOS("%schildrenCount %zd", indentStr, childrenCount);
        
        if(recursive) {
            if(childrenCount>0) {
                for(auto & c : pnode->getChildren()) {
                    showNodeInfo(c, indent+1, recursive);
                }
            }
        }
    }
}

cocos2d::Node* findChildrenNode(cocos2d::Node* pnode, const char* clz_name,  std::function<bool(cocos2d::Node* pnode)> fn , bool recursive)
{
    for(auto & c : pnode->getChildren()) {
        auto* pnodename = getClassName(c);
        if (!strcmp(pnodename, clz_name) && fn(c) ) return c;
        if(recursive)
        {
            auto* pc = findChildrenNode(c, clz_name, fn, recursive);
            if(pc!=nullptr) return pc;
        }
    }
    return NULL;
}
