import { LucideIcon } from "lucide-react"
import Link from "next/link"
import { openSans } from "@/lib/fonts"

interface ServiceCardProps {
  title: string
  description: string
  icon: LucideIcon
  href: string
  features: string[]
  variant?: "orange" | "teal"
}

const variantStyles = {
  orange: {
    iconBg: "#E56E14",
    dot: "bg-[#0F3D8F]",
  },
  teal: {
    iconBg: "#E56E14",
    dot: "bg-[#0F3D8F]",
  },
}

export function ArthurSaboyaServiceCard({
  title,
  description,
  icon: Icon,
  href,
  features,
  variant = "orange",
}: ServiceCardProps) {
  const styles = variantStyles[variant]

  return (
    <Link href={href} className="group block h-full w-full md:max-w-[496px]">
      <div
        className="box-border flex h-full min-h-0 w-full flex-col rounded-2xl border border-[rgba(0,91,144,0.2)] bg-white p-5 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] transition-all duration-200 sm:p-6 md:min-h-[277px] md:p-8"
      >
        <div className="flex min-h-0 flex-1 flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl sm:h-[72px] sm:w-[72px]"
            style={{ backgroundColor: styles.iconBg }}
          >
            <Icon className="h-7 w-7 text-white sm:h-8 sm:w-8" />
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h3
              className={`${openSans.className} mb-2 text-xl font-bold leading-tight text-[#0E171E] sm:text-[22px] md:text-[24px] md:leading-[1.2]`}
            >
              {title}
            </h3>
            <p
              className={`${openSans.className} mb-4 text-[15px] leading-snug text-[#4C575F] sm:mb-5 sm:text-[16px] sm:leading-[1.35]`}
            >
              {description}
            </p>

            <ul className="mx-auto flex w-fit flex-col gap-2 bg-white p-0 md:min-h-[104px] md:max-w-[293px] sm:mx-0 sm:w-auto">
              {features.map((feature, index) => (
                <li
                  key={index}
                  className={`${openSans.className} flex items-start justify-center gap-2.5 text-center text-[13px] leading-snug text-[#4C575F] sm:justify-start sm:gap-3 sm:text-left sm:text-[14px] sm:leading-[1.35]`}
                >
                  <div className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${styles.dot}`} />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Link>
  )
}
