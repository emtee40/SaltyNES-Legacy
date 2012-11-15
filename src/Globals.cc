
#include "SaltyNES.h"

#ifdef SDL
    SDL_Surface* Globals::sdl_screen = NULL;
#endif

    double Globals::CPU_FREQ_NTSC = 1789772.5;
    double Globals::CPU_FREQ_PAL = 1773447.4;
    int Globals::preferredFrameRate = 60;
    
    // Microseconds per frame:
    const double Globals::MS_PER_FRAME = 1000000.0 / 60.0;
    // What value to flush memory with on power-up:
    short Globals::memoryFlushValue = 0xFF;

    bool Globals::disableSprites = false;
    bool Globals::palEmulation = false;
    bool Globals::enableSound = true;

    std::map<string, uint32_t> Globals::keycodes; //Java key codes
    std::map<string, string> Globals::controls; //vNES controls codes

