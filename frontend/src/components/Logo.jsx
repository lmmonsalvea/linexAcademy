import React from 'react'

export default function Logo({ size = 'md' }){
  return (
    <span className={`logo ${size}`}>
      <span className="lx">Linex</span><span className="tr">Academy</span>
    </span>
  )
}
