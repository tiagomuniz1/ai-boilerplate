import { useAccessRequestModalStore } from './access-request-modal.store'

describe('useAccessRequestModalStore', () => {
  beforeEach(() => {
    useAccessRequestModalStore.setState({ isOpen: false })
  })

  it('starts closed', () => {
    expect(useAccessRequestModalStore.getState().isOpen).toBe(false)
  })

  it('opens the modal', () => {
    useAccessRequestModalStore.getState().open()
    expect(useAccessRequestModalStore.getState().isOpen).toBe(true)
  })

  it('closes the modal', () => {
    useAccessRequestModalStore.setState({ isOpen: true })
    useAccessRequestModalStore.getState().close()
    expect(useAccessRequestModalStore.getState().isOpen).toBe(false)
  })
})
