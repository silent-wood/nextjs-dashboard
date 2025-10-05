import Form from "@/app/ui/invoices/create-form"
import Breadcrumbs from "@/app/ui/invoices/breadcrumbs"
import { fetchCustomers } from "@/app/lib/data"

const Page = async () => {
  const customers = await fetchCustomers();

  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: "invoices",href: '/dashboard/invoices' },
          { 
            label: 'Create Invoice',
            href: '/dashboard/invoices/create',
            active: true
          }
        ]}
      >
      </Breadcrumbs>
      <Form customers={customers}></Form>
    </main>
  )
}

export default Page