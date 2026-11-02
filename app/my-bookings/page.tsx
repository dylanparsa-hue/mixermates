import { CustomerBooking } from '@/components/customer-booking';
import { customerTestEnabled } from '@/lib/customer-policy';
import { redirect } from 'next/navigation';
export const dynamic='force-dynamic';
export default function Page(){if(!customerTestEnabled())redirect('/explore');return <CustomerBooking history/>;}
