import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.log('Erreur capturée :', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, fontFamily: 'Arial, sans-serif' }}>
          <h2>Une erreur a bloqué cette page</h2>
          <p>Recharge l’application ou retourne à l’accueil.</p>
          <pre style={{ whiteSpace: 'pre-wrap' }}>
            {String(this.state.error)}
          </pre>
        </div>
      )
    }

    return this.props.children
  }
}
