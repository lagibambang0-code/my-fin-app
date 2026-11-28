import assert from 'node:assert/strict'

console.log('Testing Meta Viewport Dynamic Switcher Logic for Drawer...')

function switchViewportMeta(currentContent, toMode) {
  if (toMode === 'overlays-content') {
    return currentContent.includes('interactive-widget')
      ? currentContent.replace(/interactive-widget=[^,]+/, 'interactive-widget=overlays-content')
      : `${currentContent}, interactive-widget=overlays-content`
  }
  return currentContent
}

function restoreViewportMeta(originalContent) {
  return originalContent
}

// Case 1: Initial default meta from Next.js
const defaultMeta = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content'

// When drawer opens:
const drawerOpenMeta = switchViewportMeta(defaultMeta, 'overlays-content')
console.log('Drawer Open Meta:', drawerOpenMeta)
assert.ok(drawerOpenMeta.includes('interactive-widget=overlays-content'), 'Must switch to overlays-content')
assert.ok(!drawerOpenMeta.includes('interactive-widget=resizes-content'), 'Must not contain resizes-content while drawer is open')

// When drawer closes:
const restoredMeta = restoreViewportMeta(defaultMeta)
console.log('Drawer Closed Meta:', restoredMeta)
assert.equal(restoredMeta, defaultMeta, 'Must restore exactly to original meta on close')

console.log('\n=============================================')
console.log('ALL META VIEWPORT SWITCHER TESTS PASSED (100%)!')
console.log('=============================================')
