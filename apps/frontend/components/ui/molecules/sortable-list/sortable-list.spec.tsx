import { render, screen } from '@testing-library/react'
import { SortableItem, SortableList } from './sortable-list'

// Capture the onDragEnd handler injected into DndContext so tests can invoke it directly.
let capturedOnDragEnd: ((event: any) => void) | undefined

jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ onDragEnd, children }: any) => {
    capturedOnDragEnd = onDragEnd
    return <div data-testid="dnd-context">{children}</div>
  },
  closestCenter: jest.fn(),
  KeyboardSensor: class {},
  PointerSensor: class {},
  useSensor: jest.fn(),
  useSensors: jest.fn(() => []),
}))

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => <div>{children}</div>,
  sortableKeyboardCoordinates: jest.fn(),
  useSortable: jest.fn(() => ({
    attributes: { role: 'button' },
    listeners: { onPointerDown: jest.fn() },
    setNodeRef: jest.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  })),
  verticalListSortingStrategy: jest.fn(),
}))

jest.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: jest.fn(() => undefined) } },
}))

const ids = ['a', 'b', 'c']

function makeDragEvent(activeId: string, overId: string | null) {
  return {
    active: { id: activeId },
    over: overId !== null ? { id: overId } : null,
  }
}

describe('SortableList', () => {
  const onReorder = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    capturedOnDragEnd = undefined
  })

  function renderList() {
    render(
      <SortableList ids={ids} onReorder={onReorder}>
        {ids.map((id) => (
          <SortableItem key={id} id={id}>
            {() => <div data-testid={`item-${id}`}>{id}</div>}
          </SortableItem>
        ))}
      </SortableList>,
    )
  }

  it('renders children inside the DndContext', () => {
    renderList()
    expect(screen.getByTestId('item-a')).toBeInTheDocument()
    expect(screen.getByTestId('item-b')).toBeInTheDocument()
    expect(screen.getByTestId('item-c')).toBeInTheDocument()
  })

  it('does not call onReorder when over is null', () => {
    renderList()
    capturedOnDragEnd!(makeDragEvent('a', null))
    expect(onReorder).not.toHaveBeenCalled()
  })

  it('does not call onReorder when active and over are the same item', () => {
    renderList()
    capturedOnDragEnd!(makeDragEvent('a', 'a'))
    expect(onReorder).not.toHaveBeenCalled()
  })

  it('calls onReorder with correct indices when items are different', () => {
    renderList()
    capturedOnDragEnd!(makeDragEvent('a', 'c'))
    expect(onReorder).toHaveBeenCalledWith(0, 2)
  })

  it('does not call onReorder when an id is not found in the list', () => {
    renderList()
    capturedOnDragEnd!(makeDragEvent('a', 'z'))
    expect(onReorder).not.toHaveBeenCalled()
  })
})

describe('SortableItem', () => {
  it('renders the child via render prop and passes handle props', () => {
    const child = jest.fn(() => <div data-testid="child" />)
    render(
      <SortableList ids={['x']} onReorder={jest.fn()}>
        <SortableItem id="x">{child}</SortableItem>
      </SortableList>,
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(child).toHaveBeenCalledWith(expect.objectContaining({ role: 'button' }))
  })

  it('applies reduced opacity while dragging', () => {
    const { useSortable } = require('@dnd-kit/sortable')
    useSortable.mockReturnValueOnce({
      attributes: {},
      listeners: {},
      setNodeRef: jest.fn(),
      transform: null,
      transition: undefined,
      isDragging: true,
    })

    const { container } = render(
      <SortableList ids={['x']} onReorder={jest.fn()}>
        <SortableItem id="x">{() => <div>dragging</div>}</SortableItem>
      </SortableList>,
    )

    const wrapper = container.querySelector('[style*="opacity: 0.5"]')
    expect(wrapper).not.toBeNull()
  })
})
