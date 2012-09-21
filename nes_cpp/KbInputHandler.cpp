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


class KbInputHandler : public KeyListener,  IInputHandler {
public:
    bool[] allKeysState;
    int[] keyMapping;
    int id;
    NES* nes;

     KbInputHandler(NES* nes, int id) {
        this.nes = nes;
        this.id = id;
        allKeysState = new bool[255];
        keyMapping = new int[IInputHandler.NUM_KEYS];
    }

     short getKeyState(int padKey) {
        return (short) (allKeysState[keyMapping[padKey]] ? 0x41 : 0x40);
    }

     void mapKey(int padKey, int kbKeycode) {
        keyMapping[padKey] = kbKeycode;
    }

     void keyPressed(KeyEvent ke) {

        int kc = ke.getKeyCode();
        if (kc >= allKeysState.length) {
            return;
        }

        allKeysState[kc] = true;

        // Can't hold both left & right or up & down at same time:
        if (kc == keyMapping[IInputHandler.KEY_LEFT]) {
            allKeysState[keyMapping[IInputHandler.KEY_RIGHT]] = false;
        } else if (kc == keyMapping[IInputHandler.KEY_RIGHT]) {
            allKeysState[keyMapping[IInputHandler.KEY_LEFT]] = false;
        } else if (kc == keyMapping[IInputHandler.KEY_UP]) {
            allKeysState[keyMapping[IInputHandler.KEY_DOWN]] = false;
        } else if (kc == keyMapping[IInputHandler.KEY_DOWN]) {
            allKeysState[keyMapping[IInputHandler.KEY_UP]] = false;
        }
    }

     void keyReleased(KeyEvent ke) {

        int kc = ke.getKeyCode();
        if (kc >= allKeysState.length) {
            return;
        }

        allKeysState[kc] = false;

        if (id == 0) {
            switch (kc) {
                case KeyEvent.VK_F5: {
                    // Reset game:
                    if (nes.isRunning()) {
                        nes.stopEmulation();
                        nes.reset();
                        nes.reloadRom();
                        nes.startEmulation();
                    }
                    break;
                }
                case KeyEvent.VK_F10: {
                    // Just using this to display the battery RAM contents to user.
                    if (nes.rom != NULL) {
                        nes.rom.closeRom();
                    }
                    break;
                }
                case KeyEvent.VK_F12: {
                    JOptionPane.showInputDialog("Save Code for Resuming Game.", "Test");
                    break;
                }
            }
        }

    }

     void keyTyped(KeyEvent ke) {
        // Ignore.
    }

     void reset() {
        allKeysState = new bool[255];
    }

     void update() {
        // doesn't do anything.
    }

     void destroy() {
        nes = NULL;
    }

};