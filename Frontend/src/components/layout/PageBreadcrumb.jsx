import { Link } from "react-router-dom"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export default function PageBreadcrumb({ items = [], current }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => (
          <BreadcrumbItem key={`${item.label}-${index}`}>
            <BreadcrumbLink asChild className="text-slate-400 hover:text-blue-300">
              <Link to={item.to}>{item.label}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
        ))}

        {items.length > 0 && current ? <BreadcrumbSeparator /> : null}

        {current ? (
          <BreadcrumbItem>
            <BreadcrumbPage className="text-slate-200">{current}</BreadcrumbPage>
          </BreadcrumbItem>
        ) : null}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
