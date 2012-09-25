/*
vNES
Copyright © 2006-2011 Jamie Sanders

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU General Public License as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later
version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with
this program.  If not, see <http://www.gnu.org/licenses/>.
 */

#include "Globals.h"

     long HiResTimer::currentMicros() {
	    timespec ts;
		clock_gettime(CLOCK_REALTIME, &ts);
        return ts.tv_nsec / 1000;
    }

     long HiResTimer::currentTick() {
	    timespec ts;
		clock_gettime(CLOCK_REALTIME, &ts);
        return ts.tv_nsec;
    }

     void HiResTimer::sleepMicros(long time) {

        try {

            long nanos = time - (time / 1000) * 1000;
            if (nanos > 999999) {
                nanos = 999999;
            }
            
			struct timespec req={0};
			req.tv_sec = 0;
			req.tv_nsec = (long)nanos;
			nanosleep(&req, NULL);
            sleep(time / 1000);

        } catch (exception& e) {

            //System.out.println("Sleep interrupted..");
//            e.printStackTrace();

        }

    }

     void HiResTimer::sleepMillisIdle(int millis) {

        millis /= 10;
        millis *= 10;

        try {
            sleep(millis);
        } catch (exception& ie) {
        }

    }

     void HiResTimer::yield() {
        pthread_yield();
    }
