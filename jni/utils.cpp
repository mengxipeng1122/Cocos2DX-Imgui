
#include "utils.h"

char* getClassName(void* pobj)
{
    const auto* pthiz = (unsigned char*)pobj;               //LOG_INFOS("%p", pthiz);
    const auto* pftab =*(unsigned char**)&pthiz[0];         //LOG_INFOS("%p", pftab);
    const auto* p     =*(unsigned char**)&pftab[-8];        //LOG_INFOS("%p", p    );
    if(p!=NULL)
    {
        auto* s = *(char**)&p[0x08];                        //LOG_INFOS(" s %p ", s);
        return s;
    }
    return (char*)NULL;
}

