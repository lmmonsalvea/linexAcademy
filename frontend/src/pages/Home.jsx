import React from 'react'
import Landing from './Landing'
import Dashboard from './Dashboard'
import { getCurrentUser } from '../utils/auth'

export default function Home(){
  const user = getCurrentUser()
  return user ? <Dashboard /> : <Landing />
}
