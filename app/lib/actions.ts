'use server';
// zod 是验证类型的库
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import postgres from 'postgres';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require'});

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: '请选择一个创建人'
  }),
  amount: z.coerce.number().gt(0, {
    message: "金额大于0"
  }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: "请选择状态"
  }),
  date: z.string()
})

const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInfoice = FormSchema.omit({ id: true, date: true });

// 从 useActionState 钩子传递的状态
export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

// 创建发票
export async function createInvoice(prevState: State, formData: FormData) {
  // 从原数据中提取组装成普通对象
  // 1. 直接挨个取
  // const rawFormData = {
  //   customerId: formData.get('customerId'),
  //   amount: formData.get('amount'),
  //   status: formData.get('status')
  // }
  // 2. 遍历的方式
  // const rawFormData: Record<string, any> = {}
  // for(const [key, val] of formData.entries()) {
  //   rawFormData[key] = val
  // }
  // 3. 使用Object.fromEnties
  // const rawFormData = Object.fromEntries(formData)
  // console.log(rawFormData)

  // 验证类型
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status')
  });
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "创建失败"
    }
  }
  const { customerId, amount, status } = validatedFields.data;
  // 美元 -> 美分
  const amountInCents = amount * 100;
  // 创建日期
  const date = new Date().toISOString().split('T')[0];
  try {
    // 插入数据库
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  } catch (error) {
    console.log(error, 'create')
    return {
      message: '创建invoice失败'
    }
  }
  
  // Next.js 有一个客户端路由器缓存，可以将路由段存储在用户的浏览器中一段时间。除了预取之外，此缓存还确保用户可以在路由之间快速导航，同时减少向服务器发出的请求数量。
  // 插数据库中插入数据后，需要更新发票页面中的显示数据，这是为了清除缓存并触发对服务器的心情球
  revalidatePath('/dashboard/invoices');
  // 页面重定向
  redirect('/dashboard/invoices');
}

// 更新发票
export async function updateInvoice(id: string, formData: FormData): Promise<void> {
  const { customerId, amount, status } = UpdateInfoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status')
  });

  const amountInCents = amount * 100;
  try {
    await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}
  `;
  } catch (error) {
    console.log(error, "update")
    return Promise.reject({
      message: "更新invoice失败"
    })
  }
  

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

// 删除发票
export async function deleteInvoice(id: string): Promise<void> {
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`
  } catch (error) {
    console.log(error, 'delete')
    return Promise.reject({
      message: "删除invoice失败"
    })
  }
  
  revalidatePath('/dashboard/invoices');
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData
) {
  try {
    await signIn('credentials', formData)
  } catch (error) {
    if (error instanceof AuthError) {
      switch(error.type) {
        case "CredentialsSignin":
          return "无效的凭证"
        default:
          return "出错了"
      }
    }
    throw error
  }
}