
#pragma once


#include <stdio.h>
#include "frida_funs.h"

#define LOG_INFOS_WITH_N(N, fmt, args...)                         \
do{                                                               \
    char buff[N];                                                 \
    snprintf(buff, N, "[%s:%d]" fmt , __FILE__, __LINE__, ##args);\
    _frida_log(buff);                                             \
}while(0)

#define LOG_INFOS(fmt, args...)  LOG_INFOS_WITH_N(0x800, fmt, ##args)

#define LOG_ERRS(fmt, args...)                                        \
do{                                                                   \
    LOG_INFOS_WITH_N(0x200, fmt, ##args);                             \
    _frida_err();                                                     \
}while(0)

char* getClassName(void* pobj);

