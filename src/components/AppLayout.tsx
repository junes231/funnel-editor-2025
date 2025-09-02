import { getAuth, signOut } from 'firebase/auth';

export default function AppLayout({ user, isAdmin }:{
  user:any; isAdmin:boolean;
}) {
  return (
    <div style={{
      marginBottom:20, paddingBottom:12,
      borderBottom:'1px solid #ccc',
      display:'flex', justifyContent:'space-between', alignItems:'center'
    }}>
      <span>
        Welcome, <strong>{user.email}</strong>
        {isAdmin && <span style={{color:'red',marginLeft:8}}>(Admin)</span>}
      </span>
      <button
        onClick={async ()=> {
          await signOut(getAuth());
          window.location.replace('/#/login');
        }}
        style={{padding:'6px 14px'}}
      >Logout</button>
    </div>
  );
}
