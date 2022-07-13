
#pragma once 

#ifdef __cplusplus 
extern "C" {
#endif

void _frida_log(const char* s);
void _frida_err(const char* s);
void _frida_hexdump(const void*, unsigned int n);

#ifdef __cplusplus 
}
#endif

