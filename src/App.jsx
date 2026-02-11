// import { BrowserRouter, Route, Routes } from "react-router-dom";
// import Login from "./Login/Login";
// import PrivateRoute from "./PrivateRoute";
// import Dashboard from "./Dashboard/DashBoard";
// import Controller from "./Controller/Controller";

// export default function App() {
//   return (
//     // <BrowserRouter>
//     //   <Routes>
//     //     <Route path="/" element={<Login/>}/>
//     //     <Route path="Dashboard" element={<DashBoard/>}/>
//     //   </Routes>
//     // </BrowserRouter>
//     <BrowserRouter>
//       <Routes>
//         <Route path="/" element={<Login />} />
        
//         <Route
//           path="/Dashboard"
//           element={
//             <PrivateRoute>
//               <Dashboard />
//             </PrivateRoute>
//           }
//         />
//               <Route
//           path="/Controller"
//           element={
//             <PrivateRoute>
//               <Controller />
//             </PrivateRoute>
//           }
//         />
//       </Routes>

//     </BrowserRouter>
//   )
// }

import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./Login/Login";
import PrivateRoute from "./PrivateRoute";
import Dashboard from "./Dashboard/DashBoard";
import Controller from "./Controller/Controller";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          path="/Dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/Controller"
          element={
            <PrivateRoute>
              <Controller />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
