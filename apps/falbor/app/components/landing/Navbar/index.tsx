'use client';

import React from 'react';
import MacOSMenuBar from './navbar';


export default function DefaultDemo() {
    return (
        <div>
            <div style={{
                position: 'relative',
                top: '0px',
                left: '0%',
                width: '100%',
                zIndex: 9999,
            }}>
                <MacOSMenuBar
                    onMenuAction={(action) => {
                        console.log('Menu action:', action);
                    }}
                />
            </div>
        </div>
    );
}