"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Heart, Play } from "lucide-react";
import React from "react";

// Placeholder data - replace with actual images from Figma export
const avatars = [
  { src: "/images/ellipse-2.png", alt: "User avatar 1" },
  { src: "/images/ellipse-3.png", alt: "User avatar 2" },
  { src: "/images/ellipse-4.png", alt: "User avatar 3" },
  { src: "/images/ellipse-5.png", alt: "User avatar 4" },
  { src: "/images/ellipse-6.png", alt: "User avatar 5" },
];

const newReleases = [
  { image: "/images/rectangle-14.png", title: "Life in a bubble", artist: "The van" },
  { image: "/images/image-1.png", title: "Mountain", artist: "Krisx" },
  { image: "/images/rectangle-14-2.png", title: "Limits", artist: "John Dillion" },
  { image: "/images/rectangle-14-3.png", title: "Everything's black", artist: "Ameed" },
  { image: "/images/rectangle-14-4.png", title: "Cancelled", artist: "Enimen" },
  { image: "/images/rectangle-14-5.png", title: "Nomad", artist: "Makrol eli" },
  { image: "/images/rectangle-14-6.png", title: "Blind", artist: "Wiz zee" },
];

const popularInArea = [
  { image: "/images/rectangle-14-8.png", title: "Life in a bubble", artist: "The van" },
  { image: "/images/rectangle-14-9.png", title: "Mountain", artist: "Krisx" },
  { image: "/images/rectangle-14-10.png", title: "Limits", artist: "John Dillion" },
  { image: "/images/rectangle-14-11.png", title: "Everything's black", artist: "Ameed" },
  { image: "/images/rectangle-14-12.png", title: "Cancelled", artist: "Enimen" },
  { image: "/images/rectangle-14-13.png", title: "Nomad", artist: "Makrol eli" },
  { image: "/images/rectangle-14-7.png", title: "Blind", artist: "Wiz zee" },
];

const topCharts = [
  {
    image: "/images/rectangle-17.svg",
    title: "Golden age of 80s",
    artist: "Sean swadder",
    duration: "2:34:45",
    strokeIcon: "/images/stroke-3.svg",
  },
  {
    image: "/images/rectangle-17-2.svg",
    title: 'Reggae "n" blues',
    artist: "Dj YK mule",
    duration: "1:02:42",
    strokeIcon: "/images/stroke-3-2.svg",
  },
  {
    image: "/images/rectangle-17-3.svg",
    title: "Tomorrow's tunes",
    artist: "Obi Datti",
    duration: "2:01:25",
    strokeIcon: "/images/stroke-3-3.svg",
  },
];

export const NavigationSection = (): JSX.Element => {
  return (
    <section className="relative w-full h-auto px-6">
      <div className="grid grid-cols-1 lg:grid-cols-[686px_1fr] gap-6">
        <div className="relative">
          <div className="absolute top-[95px] left-[89px] w-[507px] h-[287px] bg-[#7a8f95] blur-[25.58px] mix-blend-color-dodge opacity-45" />

          <Card className="relative w-full h-[373px] bg-[#5f9eaf] rounded-[40px] overflow-hidden border-0">
            <CardContent className="relative p-0 h-full">
              <div className="absolute top-[38px] left-[45px] font-regular-12px font-[number:var(--regular-12px-font-weight)] text-white text-[length:var(--regular-12px-font-size)] tracking-[var(--regular-12px-letter-spacing)] leading-[var(--regular-12px-line-height)] whitespace-nowrap [font-style:var(--regular-12px-font-style)]">
                Currated playlist
              </div>

              <div className="absolute top-[137px] left-[45px] flex flex-col gap-1.5">
                <h2 className="font-bold-35px font-[number:var(--bold-35px-font-weight)] text-white text-[length:var(--bold-35px-font-size)] tracking-[var(--bold-35px-letter-spacing)] leading-[var(--bold-35px-line-height)] whitespace-nowrap [font-style:var(--bold-35px-font-style)]">
                  R &amp; B Hits
                </h2>

                <p className="[font-family:'Quicksand-Regular',Helvetica] font-normal text-white text-sm tracking-[0] leading-[16.8px]">
                  All mine, Lie again, Petty call me everyday,
                  <br />
                  Out of time, No love, Bad habit,
                  <br />
                  and so much more
                </p>
              </div>

              <div className="absolute top-[312px] left-[54px] flex items-center gap-[11px]">
                <div className="flex items-start">
                  {avatars.map((avatar, index) => (
                    <img
                      key={index}
                      className={`relative w-5 h-5 object-cover ${index > 0 ? "ml-[-9px]" : ""}`}
                      alt={avatar.alt}
                      src={avatar.src}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-4 h-4">
                    <Heart className="w-[13px] h-[13px] absolute top-0.5 left-px text-white fill-white" />
                  </div>

                  <span className="font-regular-14px font-[number:var(--regular-14px-font-weight)] text-white text-[length:var(--regular-14px-font-size)] tracking-[var(--regular-14px-letter-spacing)] leading-[var(--regular-14px-line-height)] whitespace-nowrap [font-style:var(--regular-14px-font-style)]">
                    33k Likes
                  </span>
                </div>
              </div>

              <img
                className="absolute w-[162.63%] h-[74.26%] top-[-78.28%] left-0"
                alt="Background vector"
                src="/images/image.svg"
              />

              <img
                className="absolute top-[-198px] left-[343px] w-[381px] h-[571px] object-cover"
                alt="Featured artist"
                src="/images/pexels-photo-by-eric-esma.png"
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-[15px]">
          <h2 className="font-bold-24px font-[number:var(--bold-24px-font-weight)] text-light text-[length:var(--bold-24px-font-size)] tracking-[var(--bold-24px-letter-spacing)] leading-[var(--bold-24px-line-height)] whitespace-nowrap [font-style:var(--bold-24px-font-style)]">
            Top charts
          </h2>

          <div className="flex flex-col gap-[15px]">
            {topCharts.map((chart, index) => (
              <Card
                key={index}
                className="bg-dark-alt rounded-[20px] border-0 overflow-hidden"
              >
                <CardContent className="relative p-0 h-24">
                  <img
                    className="absolute top-[17px] left-[17px] w-[63px] h-[63px] object-cover"
                    alt={chart.title}
                    src={chart.image}
                  />

                  <div className="absolute top-[17px] left-[94px] font-regular-17px font-[number:var(--regular-17px-font-weight)] text-white text-[length:var(--regular-17px-font-size)] tracking-[var(--regular-17px-letter-spacing)] leading-[var(--regular-17px-line-height)] whitespace-nowrap [font-style:var(--regular-17px-font-style)]">
                    {chart.title}
                  </div>

                  <div className="absolute top-[41px] left-[94px] font-regular-12px font-[number:var(--regular-12px-font-weight)] text-[#ffffff80] text-[length:var(--regular-12px-font-size)] tracking-[var(--regular-12px-letter-spacing)] leading-[var(--regular-12px-line-height)] whitespace-nowrap [font-style:var(--regular-12px-font-style)]">
                    {chart.artist}
                  </div>

                  <button className="absolute top-[30px] left-[359px] w-[37px] h-[37px] rounded-[18.5px] border border-solid border-[#ffffff1c] flex items-center justify-center hover:bg-[#ffffff0a] transition-colors">
                    <div className="w-[18px] h-[18px] flex items-center justify-center">
                      <Play className="w-3.5 h-[13px] text-white fill-white" />
                    </div>
                  </button>

                  <div className="absolute top-[63px] left-[94px] font-regular-12px font-[number:var(--regular-12px-font-weight)] text-white text-[length:var(--regular-12px-font-size)] tracking-[var(--regular-12px-letter-spacing)] leading-[var(--regular-12px-line-height)] whitespace-nowrap [font-style:var(--regular-12px-font-style)]">
                    {chart.duration}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-[43px]">
        <h2 className="font-bold-24px font-[number:var(--bold-24px-font-weight)] text-light text-[length:var(--bold-24px-font-size)] tracking-[var(--bold-24px-letter-spacing)] leading-[var(--bold-24px-line-height)] whitespace-nowrap [font-style:var(--bold-24px-font-style)] mb-[9px]">
          New releases.
        </h2>

        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-[30px] pb-4">
            {newReleases.map((release, index) => (
              <div
                key={index}
                className="inline-flex flex-col gap-[5px] w-[153px]"
              >
                <img
                  className="w-[153px] h-[153px] object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                  alt={release.title}
                  src={release.image}
                />

                <div className="[font-family:'Quicksand-Regular',Helvetica] font-normal text-white text-xs tracking-[0] leading-[normal]">
                  {release.title}
                </div>

                <div className="[font-family:'Quicksand-Regular',Helvetica] font-normal text-[#ffffff80] text-xs tracking-[0] leading-[normal]">
                  {release.artist}
                </div>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      <div className="mt-[57px]">
        <h2 className="font-bold-24px font-[number:var(--bold-24px-font-weight)] text-light text-[length:var(--bold-24px-font-size)] tracking-[var(--bold-24px-letter-spacing)] leading-[var(--bold-24px-line-height)] whitespace-nowrap [font-style:var(--bold-24px-font-style)] mb-[9px]">
          Popular in your area
        </h2>

        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-[30px] pb-4">
            {popularInArea.map((item, index) => (
              <div
                key={index}
                className="inline-flex flex-col gap-[5px] w-[153px]"
              >
                <img
                  className="w-[153px] h-[153px] object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                  alt={item.title}
                  src={item.image}
                />

                <div className="[font-family:'Quicksand-Regular',Helvetica] font-normal text-white text-xs tracking-[0] leading-[normal]">
                  {item.title}
                </div>

                <div className="[font-family:'Quicksand-Regular',Helvetica] font-normal text-[#ffffff80] text-xs tracking-[0] leading-[normal]">
                  {item.artist}
                </div>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </section>
  );
};

export default NavigationSection;
