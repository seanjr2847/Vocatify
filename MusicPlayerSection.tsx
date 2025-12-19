import { Button } from "@/components/ui/button";
import {
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import React from "react";

export const MusicPlayerSection = (): JSX.Element => {
  return (
    <footer className="relative w-full h-[125px] bg-[#1d21234c] border border-solid border-[#ffffff1a] shadow-[0px_-25px_100px_#0f0f0f82] backdrop-blur-[15px] backdrop-brightness-[100%] [-webkit-backdrop-filter:blur(15px)_brightness(100%)]">
      <div className="flex items-center justify-between h-full px-8">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-[49px] h-[49px] bg-white/10 rounded">
            {/* Album artwork placeholder - add your album src here */}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-white text-[14px] leading-[17px] whitespace-nowrap">
              Seasons in
            </span>
            <span className="font-bold text-[#ffffff70] text-[10px] leading-[12px] whitespace-nowrap">
              James
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 flex-1">
          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              size="icon"
              className="h-auto w-auto p-0 hover:bg-transparent"
            >
              <Shuffle className="w-[26px] h-[26px] text-white" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-auto w-auto p-0 hover:bg-transparent"
            >
              <SkipBack className="w-[26px] h-[26px] text-white" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-auto w-auto p-0 hover:bg-transparent"
            >
              <div className="w-[51px] h-[51px] rounded-full bg-[#facd66] flex items-center justify-center">
                <Play className="w-[20px] h-[20px] text-black fill-black ml-1" />
              </div>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-auto w-auto p-0 hover:bg-transparent"
            >
              <SkipForward className="w-[26px] h-[26px] text-white" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-auto w-auto p-0 hover:bg-transparent"
            >
              <Repeat className="w-[26px] h-[26px] text-white" />
            </Button>
          </div>

          <div className="relative w-[749px] h-[12px]">
            <div className="absolute w-full h-[4px] top-[4px] left-0 bg-[#ffffff0a] rounded-[50px]" />
            <div className="absolute w-[33.91%] h-[4px] top-[4px] left-0 bg-[#facd66] rounded-[50px]" />
            <div className="absolute w-[12px] h-[12px] top-0 left-[32.84%] bg-[#facd66] rounded-full shadow-[0px_0px_8px_#000000eb] -translate-x-1/2" />
          </div>
        </div>

        <div className="flex items-center gap-3 flex-1 justify-end">
          <Volume2 className="w-[18px] h-[18px] text-white" />
          <div className="relative w-[160px] h-[3px]">
            <div className="absolute w-full h-full bg-[#ffffff1a] rounded-[42px]" />
            <div className="absolute w-[32%] h-full bg-[#facd66] rounded-[42px]" />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default MusicPlayerSection;
