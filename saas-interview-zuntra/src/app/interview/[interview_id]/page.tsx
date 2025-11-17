
import Image from 'next/image';

const Interview = () => {
    return (
       <div className="px-10 md:px-28 lg:px-48 xl:px-64 mt-16">
         <div className="flex flex-col items-center justify-center p-5 border rounded-xl bg-white">
            <Image src="/logo.png" width={200} height={100} alt="Logo"className="w-[100px]"/>
            <h2 className="font-sm mt-3">AI Powered Interview</h2>
            <Image src="/interview.png" width={500} height={500} alt="Interview pic"className="w-[280px] my-6"/>
         </div>
       </div>
    )
}
export default Interview;