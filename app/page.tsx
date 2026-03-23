'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [apiResponse, setApiResponse] = useState<string>('');

  // Listen for changes in the user's login state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe(); // Cleanup listener on unmount
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setApiResponse(''); // Clear the vault response on logout
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const testVaultAccess = async () => {
    if (!user) {
      setApiResponse("Error: You must be logged in to knock on the vault door.");
      return;
    }

    try {
      // Grab the secure JWT ID Badge for the currently logged-in user
      const token = await user.getIdToken();

      // Determine where to knock based on environment
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      // Knock on the Laravel API Vault Door
      const res = await fetch(`${API_URL}/api/heirloom-vault`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      // See what the bouncer says
      const data = await res.json();
      setApiResponse(JSON.stringify(data, null, 2));

    } catch (error: any) {
      console.error("Error:", error);
      setApiResponse(error.message || "Failed to connect.");
    }
  };

  return (
    <div style={{ padding: '50px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1>🏛️ Heirloom</h1>
      
      {/* Auth Status Section */}
      <div style={{ padding: '20px', background: '#f0f0f0', borderRadius: '8px', marginBottom: '30px' }}>
        {user ? (
          <div>
            <p>Logged in as: <strong>{user.email}</strong></p>
            <button onClick={handleLogout} style={{ padding: '8px 16px', cursor: 'pointer', marginTop: '10px' }}>
              Log Out
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '15px' }}>
            <Link href="/login" style={{ padding: '8px 16px', background: '#0070f3', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
              Log In
            </Link>
            <Link href="/signup" style={{ padding: '8px 16px', background: '#fff', color: '#0070f3', border: '1px solid #0070f3', textDecoration: 'none', borderRadius: '4px' }}>
              Sign Up
            </Link>
          </div>
        )}
      </div>

      {/* API Testing Section */}
      <div style={{ borderTop: '2px solid #eee', paddingTop: '30px' }}>
        <h2>Test API Connection</h2>
        <p style={{ fontSize: '14px', color: '#666' }}>
          This will grab your Firebase ID token and send it to the local Laravel API to see if you can access the vault.
        </p>
        <button 
          onClick={testVaultAccess}
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Knock on the Vault Door
        </button>
        
        <pre style={{ marginTop: '20px', padding: '20px', background: '#222', color: '#0f0', borderRadius: '5px', overflowX: 'auto' }}>
          {apiResponse || 'Awaiting response...'}
        </pre>
      </div>
    </div>
  );
}