import LoginPage from "../LoginPage";

export default function LoginPageExample() {
  return (
    <LoginPage
      onLogin={(email, password) => {
        console.log("Login attempted:", email, password);
      }}
    />
  );
}
