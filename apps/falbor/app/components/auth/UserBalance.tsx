import React, { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';

function UserBalance() {
    const [balance, setBalance] = useState(0);
    useEffect(() => {
        fetchBilling();
    }, []);
    const fetchBilling = async () => {
        try {
            const res = await fetch('/api/user/credits');
            if (res.ok) {
                const data = await res.json();
                setBalance(data.balance || 0);
            }
        } catch (e) {
            console.error(e);
        }
    };
    return (
        <div className='p-1 bg-[#E3E3E3] dark:bg-[#171717] rounded-lg'>
            <p
                className="text-sm bg-falbor-elements-background-depth-2
                dark:bg-[#1E1E21] backdrop-blur shadow-sm border 
                border-[#BDBDBD] dark:border-[#353538] rounded-md
                px-2 py-0.5 text-gray-900 dark:text-white
                flex items-center gap-1 font-medium"
            >
                <Zap className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                {typeof balance === 'number' ? (Number.isInteger(balance) ? balance : balance.toFixed(1)) : 0} Credits
            </p>
        </div>
    );
}

export default UserBalance;