import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { Store } from './Store.jsx';
import './styles.css';
class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() { return this.state.error ? <main className="container section"><h1>Something interrupted your workspace.</h1><p>Your saved browser data has not been cleared.</p><button className="btn" onClick={()=>window.location.assign(import.meta.env.BASE_URL)}>Reload OBRIX</button><details><summary>Error details</summary><pre>{this.state.error.message}</pre></details></main> : this.props.children; }
}
createRoot(document.getElementById('root')).render(<React.StrictMode><ErrorBoundary><BrowserRouter basename={import.meta.env.BASE_URL}><Store><App/></Store></BrowserRouter></ErrorBoundary></React.StrictMode>);
