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

 class IPapuChannel {

     virtual void writeReg(int address, int value) = 0;

     virtual void setEnabled(bool value) = 0;

     virtual bool isEnabled() = 0;

     virtual void reset() = 0;

     virtual int getLengthStatus() = 0;
};