import Image from "next/image"
import type { ReactNode } from "react"
import bannerFundo from "@/public/1900x200.png"
import { openSans } from "@/lib/fonts"

interface ArthurSaboyaPageBackgroundBannerProps {
  title?: string
  subtitle?: string
  children?: ReactNode
}

export function ArthurSaboyaPageBackgroundBanner({
  title,
  subtitle,
  children,
}: ArthurSaboyaPageBackgroundBannerProps) {
  return (
    <div className="w-full overflow-hidden bg-[#001a70]">
      <div
        className={`relative mx-auto w-full max-w-[1900px] ${children ? "min-h-[200px]" : "h-[200px]"}`}
      >
        <Image
          src={bannerFundo}
          alt=""
          aria-hidden
          className={
            children
              ? "absolute inset-0 h-full min-h-[200px] w-full object-cover"
              : "h-[200px] w-full object-cover"
          }
          priority={false}
        />
        <div
          className={
            children ? "absolute inset-0 min-h-[200px] bg-[#001a70]/45" : "absolute inset-0 bg-[#001a70]/45"
          }
        />
        {children ? (
          <div className="relative z-10 min-h-[200px] px-4 py-5 sm:py-6">
            <div className="container mx-auto max-w-full">{children}</div>
          </div>
        ) : title ? (
          <div className="absolute inset-0 flex items-center justify-center px-4 text-center">
            <div>
              <h1 className={`${openSans.className} text-3xl font-extrabold text-white md:text-4xl`}>
                {title}
              </h1>
              {subtitle ? (
                <p className={`${openSans.className} mt-2 text-sm text-white/90 md:text-base`}>
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
