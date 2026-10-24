import { createSlice } from "@reduxjs/toolkit";

// When the page is refreshed, read the saved login (if there is one) from the browser
const savedUser = localStorage.getItem("user");

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: savedUser ? JSON.parse(savedUser) : null,
    token: localStorage.getItem("token"),
  },
  reducers: {
    // action.payload is { token, user }, exactly what the server sends back
    loginSuccess: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
    },
  },
});

export const { loginSuccess, logout } = authSlice.actions;
export default authSlice.reducer;