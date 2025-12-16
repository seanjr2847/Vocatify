import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Heart, Play } from "lucide-react";
import React from "react";
import ellipse2 from "./ellipse-2.png";
import ellipse3 from "./ellipse-3.png";
import ellipse4 from "./ellipse-4.png";
import ellipse5 from "./ellipse-5.png";
import ellipse6 from "./ellipse-6.png";
import image1 from "./image.png";
import image from "./image.svg";
import pexelsPhotoByEricEsma from "./pexels-photo-by-eric-esma.png";
import rectangle142 from "./rectangle-14-2.png";
import rectangle143 from "./rectangle-14-3.png";
import rectangle144 from "./rectangle-14-4.png";
import rectangle145 from "./rectangle-14-5.png";
import rectangle146 from "./rectangle-14-6.png";
import rectangle147 from "./rectangle-14-7.png";
import rectangle148 from "./rectangle-14-8.png";
import rectangle149 from "./rectangle-14-9.png";
import rectangle1410 from "./rectangle-14-10.png";
import rectangle1411 from "./rectangle-14-11.png";
import rectangle1412 from "./rectangle-14-12.png";
import rectangle1413 from "./rectangle-14-13.png";
import rectangle14 from "./rectangle-14.png";
import rectangle172 from "./rectangle-17-2.svg";
import rectangle173 from "./rectangle-17-3.svg";
import rectangle17 from "./rectangle-17.svg";
import stroke32 from "./stroke-3-2.svg";
import stroke33 from "./stroke-3-3.svg";
import stroke3 from "./stroke-3.svg";

const avatars = [
  { src: ellipse2, alt: "User avatar 1" },
  { src: ellipse3, alt: "User avatar 2" },
  { src: ellipse4, alt: "User avatar 3" },
  { src: ellipse5, alt: "User avatar 4" },
  { src: ellipse6, alt: "User avatar 5" },
];

const newReleases = [
  { image: rectangle14, title: "Life in a bubble", artist: "The van" },
  { image: image1, title: "Mountain", artist: "Krisx" },
  { image: rectangle142, title: "Limits", artist: "John Dillion" },
  { image: rectangle143, title: "Everything's black", artist: "Ameed" },
  { image: rectangle144, title: "Cancelled", artist: "Enimen" },
  { image: rectangle145, title: "Nomad", artist: "Makrol eli" },
  { image: rectangle146, title: "Blind", artist: "Wiz zee" },
];

const popularInArea = [
  { image: rectangle148, title: "Life in a bubble", artist: "The van" },
  { image: rectangle149, title: "Mountain", artist: "Krisx" },
  { image: rectangle1410, title: "Limits", artist: "John Dillion" },
  { image: rectangle1411, title: "Everything's black", artist: "Ameed" },
  { image: rectangle1412, title: "Cancelled", artist: "Enimen" },
  { image: rectangle1413, title: "Nomad", artist: "Makrol eli" },
  { image: rectangle147, title: "Blind", artist: "Wiz zee" },
];

const topCharts = [
  {
    image: rectangle17,
    title: "Golden age of 80s",
    artist: "Sean swadder",
    duration: "2:34:45",
    strokeIcon: stroke3,
  },
  {
    image: rectangle172,
    title: 'Reggae "n" blues',
    artist: "Dj YK mule",
    duration: "1:02:42",
    strokeIcon: stroke32,
  },
  {
    image: rectangle173,
    title: "Tomorrow's tunes",
    artist: "Obi Datti",
    duration: "2:01:25",
    strokeIcon: stroke33,
  },
];

export const NavigationSection = (): JSX.Element => {
  return (
    <section className="relative w-full h-auto">
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
                src={image}
              />

              <img
                className="absolute top-[-198px] left-[343px] w-[381px] h-[571px] object-cover"
                alt="Featured artist"
                src={pexelsPhotoByEricEsma}
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
