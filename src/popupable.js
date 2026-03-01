{
  let activePopup, previousPopup, mouseDownTarget

  function disableScroll() {
    window.addEventListener("wheel", prevent, { passive: false })
    window.addEventListener("touchmove", prevent, { passive: false })
    window.addEventListener("keydown", blockKeys, true)
  }

  function enableScroll() {
    window.removeEventListener("wheel", prevent)
    window.removeEventListener("touchmove", prevent)
    window.removeEventListener("keydown", blockKeys, true)
  }

  function prevent(e) {
    e.preventDefault()
  }

  function blockKeys(e) {
    const keys = ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]
    if (keys.includes(e.key)) e.preventDefault()
  }

  function setCloneToOriginalRect(cloneContainer, original) {
    const rect = original.getBoundingClientRect()
    cloneContainer.style.top = visualViewport.offsetTop + rect.top + "px"
    cloneContainer.style.left = visualViewport.offsetLeft + rect.left + "px"
    cloneContainer.style.width = rect.width + "px"
    cloneContainer.style.height = rect.height + "px"
  }

  function openPopupable(toOpen) {
    if (toOpen.state === "open") return
    toOpen.state = "open"

    const { cloneContainer, popup, transition, group, listeners } = toOpen

    popup.classList.add("popupable-active")

    updateExpandedSize()

    cloneContainer.removeEventListener("transitionend", transition.listener)

    transition.listener = e => {
      if (e && e.target !== e.currentTarget) return
      cloneContainer.removeEventListener("transitionend", transition.listener)
      popup.classList.add("popupable-open")
      if (group) {
        for (const entry of group) {
          entry.cloneContainer.style.display = null
        }
      }
      for (const listener of listeners) {
        listener.target.addEventListener(listener.event, listener.func, listener.args)
      }
    }

    if (transition.duration) {
      cloneContainer.addEventListener("transitionend", transition.listener)
    } else {
      transition.listener()
    }
  }

  function closePopupable() {
    if (!activePopup || activePopup.state === "close") return
    activePopup.state = "close"

    const { cloneContainer, clone, original, popup, transition, group, listeners } = activePopup

    popup.classList.remove("popupable-active")
    popup.classList.remove("popupable-open")

    setCloneToOriginalRect(cloneContainer, original)

    if (group) {
      for (const [i, entry] of group.entries()) {
        if (entry.clone !== clone && i !== group.currentIndex) {
          entry.cloneContainer.style.display = "none"
        }
      }
    }

    for (const listener of listeners) {
      listener.target.removeEventListener(listener.event, listener.func)
    }

    cloneContainer.removeEventListener("transitionend", transition.listener)

    const check = activePopup
    transition.listener = e => {
      if (e && e.target !== e.currentTarget) return
      cloneContainer.removeEventListener("transitionend", transition.listener)
      original.classList.remove("popupable-hide")
      popup.remove()
      if (check === activePopup) {
        enableScroll()
        previousPopup = activePopup
        activePopup = null
      }
    }

    if (transition.duration) {
      cloneContainer.addEventListener("transitionend", transition.listener)
    } else {
      transition.listener()
    }
  }

  function updateExpandedSize() {
    if (!activePopup || activePopup.state === "close") return

    const viewportWidth = visualViewport?.width || window.innerWidth
    const viewportHeight = visualViewport?.height || window.innerHeight
    const viewportOffsetTop = visualViewport?.offsetTop || 0
    const viewportOffsetLeft = visualViewport?.offsetLeft || 0
    const viewportScale = visualViewport?.scale || 1

    document.documentElement.style.setProperty("--popupable-view-width", viewportWidth + "px")
    activePopup.popup.style.setProperty("--popupable-vv-width", viewportWidth + "px")
    activePopup.popup.style.setProperty("--popupable-vv-height", viewportHeight + "px")
    activePopup.popup.style.setProperty("--popupable-vv-top", viewportOffsetTop + "px")
    activePopup.popup.style.setProperty("--popupable-vv-left", viewportOffsetLeft + "px")
    activePopup.popup.style.setProperty("--popupable-vv-scale", viewportScale)
    activePopup.popup.style.setProperty("--popupable-vv-ui-scale", 1 / viewportScale)
    const uiScale = parseFloat(getComputedStyle(activePopup.popup).getPropertyValue("--popupable-vv-ui-scale")) || 1

    const basePadding = parseFloat(getComputedStyle(activePopup.popup).getPropertyValue("--popupable-screen-padding")) || 0
    const padding = basePadding / viewportScale

    const maxW = Math.max(0, viewportWidth - padding * 2)
    const maxH = viewportHeight - padding * 2
    const counter = activePopup.popup.querySelector(".popupable-counter")
    const counterHeight = counter ? counter.getBoundingClientRect().height / uiScale : 0

    let clones
    if (activePopup.group) {
      clones = activePopup.group
    } else {
      clones = [activePopup]
    }

    for (const clone of clones) {
      let aspect
      if (clone.maintainAspect) {
        const rect = clone.original.getBoundingClientRect()
        aspect = rect.width / rect.height
      } else {
        if (clone.cloneLayer) {
          aspect = clone.cloneLayer.naturalWidth / clone.cloneLayer.naturalHeight
        } else {
          aspect = clone.original.naturalWidth / clone.original.naturalHeight
        }
      }

      const cloneMaxH = Math.max(0, maxH)
      const contentHeight = clone.content ? clone.content.getBoundingClientRect().height / uiScale : 0
      const constrainedMaxH = Math.max(0, viewportHeight - contentHeight - counterHeight - padding * 2)

      let finalW = maxW
      let finalH = finalW / aspect

      if (finalH > cloneMaxH) {
        finalH = cloneMaxH
        finalW = finalH * aspect
      }
      if (finalH > constrainedMaxH) {
        finalH = constrainedMaxH
        finalW = finalH * aspect
      }
      if (clone.noUpscale) {
        const source = clone.cloneLayer || clone.original
        const sourceW = source.naturalWidth
        const sourceH = source.naturalHeight
        if (sourceW && sourceH) {
          const effectiveSourceW = sourceW / viewportScale
          const effectiveSourceH = sourceH / viewportScale
          const noUpscaleMultiplier = Math.min(1, effectiveSourceW / finalW, effectiveSourceH / finalH)
          if (noUpscaleMultiplier < 1) {
            finalW *= noUpscaleMultiplier
            finalH *= noUpscaleMultiplier
          }
        }
      }

      let finalTop = viewportOffsetTop + padding + (cloneMaxH - finalH) / 2
      if (contentHeight) {
        const maxTop = viewportOffsetTop + viewportHeight - contentHeight - padding - finalH
        finalTop = Math.min(finalTop, maxTop)
      }
      finalTop = Math.max(finalTop, viewportOffsetTop + counterHeight + padding)

      clone.cloneContainer.style.top = finalTop + "px"
      clone.cloneContainer.style.left = viewportOffsetLeft + padding + (maxW - finalW) / 2 + "px"
      clone.cloneContainer.style.width = finalW + "px"
      clone.cloneContainer.style.height = finalH + "px"
    }

    if (activePopup.contentContainer) {
      let active
      if (activePopup.group) {
        active = activePopup.group[activePopup.group.currentIndex]
      } else {
        active = activePopup
      }
      const rect = active.content.getBoundingClientRect()
      activePopup.contentContainer.style.height = rect.height / uiScale + "px"
    }
  }

  function cloneElement(original) {
    const cloneContainer = document.createElement("div")
    cloneContainer.className = "popupable-clone-container"
    
    if (original.hasAttribute("data-popupable-transparent")) {
      cloneContainer.classList.add("popupable-transparent")
    }

    const clone = new Image()
    clone.className = "popupable-clone"
    clone.src = original.currentSrc ?? original.src

    const styles = getComputedStyle(original)
    cloneContainer.style.borderRadius = styles.borderRadius
    clone.style.objectFit = styles.objectFit
    clone.style.objectPosition = styles.objectPosition
    clone.style.imageRendering = styles.imageRendering
    clone.style.background = styles.background

    cloneContainer.append(clone)

    let cloneLayer
    if (original.dataset.popupableSrc) {
      cloneLayer = new Image()
      cloneLayer.className = "popupable-clone-layer"
      cloneLayer.src = original.dataset.popupableSrc
      cloneLayer.style.imageRendering = styles.imageRendering
      cloneContainer.append(cloneLayer)

      if (clone.style.objectFit === "fill") {
        const rect = original.getBoundingClientRect()
        if (original.naturalWidth && original.naturalHeight && Math.abs(rect.width / rect.height - original.naturalWidth / original.naturalHeight) < 0.01) {
          clone.style.objectFit = "cover"
        }
      }
    }

    let content
    if (original.dataset.popupableTitle || original.dataset.popupableDescription) {
      content = document.createElement("div")
      content.classList = "popupable-content"

      if (original.dataset.popupableTitle) {
        const title = document.createElement("div")
        title.className = "popupable-title"
        title.textContent = original.dataset.popupableTitle
        content.append(title)
      }

      if (original.dataset.popupableDescription) {
        const description = document.createElement("div")
        description.className = "popupable-description"
        description.textContent = original.dataset.popupableDescription
        content.append(description)
      }
    }

    let zoomable
    if (original.hasAttribute("data-popupable-zoomable")) {
      zoomable = true
      cloneContainer.classList.add("popupable-zoomable")
    }

    return {
      id: original.dataset.popupable,
      original,
      cloneContainer,
      clone,
      cloneLayer,
      maintainAspect: original.hasAttribute("data-popupable-maintain-aspect"),
      noUpscale: original.hasAttribute("data-popupable-no-upscale"),
      counter: original.hasAttribute("data-popupable-counter"),
      ready: Promise.all([clone, cloneLayer].filter(Boolean).map(img =>
        img.complete ? Promise.resolve() : new Promise(resolve => {
          img.addEventListener("load", resolve, { once: true })
          img.addEventListener("error", resolve, { once: true })
        })
      )),
      content,
      zoomable
    }
  }

  let dragging, downX, downY, activeTouchPointers = 0


  document.addEventListener("pointerdown", e => {
    if (e.button !== 0) return
    if (e.pointerType === "touch") {
      activeTouchPointers++
    }
    if (!dragging) {
      mouseDownTarget = e.target
    }

    if (dragging || activePopup?.state !== "open") return
    dragging = true
    downX = e.clientX
  })

  function handleMove(e) {
    if (activePopup?.state !== "open" || !activePopup.group || !dragging) return
    const current = activePopup.group[activePopup.group.currentIndex]
    current.cloneContainer.parentElement.style.transition = "initial"
    current.cloneContainer.parentElement.style.transform = `translateX(${(e.touches?.[0].clientX ?? e.clientX) - downX}px)`
  }

  document.addEventListener("mousemove", handleMove)
  document.addEventListener("touchmove", handleMove, { passive: true })

  document.addEventListener("pointerup", async e => {
    if (e.button !== 0) return
    if (e.pointerType === "touch") {
      activeTouchPointers = Math.max(0, activeTouchPointers - 1)
      if (dragging && activeTouchPointers >= 1) return
    }

    if (dragging) {
      dragging = false
      const current = activePopup.group ? activePopup.group[activePopup.group.currentIndex] : activePopup
      current.cloneContainer.parentElement.style.transition = null
      current.cloneContainer.parentElement.style.transform = null
      const dx = e.clientX - downX
      const dxa = Math.abs(dx)
      if (activePopup.group && dxa > 3) {
        const multiplier = Math.max(0, Math.floor((dxa - window.innerWidth / 2) / window.innerWidth))
        if (dx > 32) {
          for (let i = 0; i <= multiplier; i++) {
            activePopup.goPrev()
          }
        } else if (dx < -32) {
          for (let i = 0; i <= multiplier; i++) {
            activePopup.goNext()
          }
        }
        activePopup.blocked = true
        return
      }
    }

    const allowViewportRelease = e.target.closest(".popupable-viewport") && !mouseDownTarget.closest(".popupable-viewport")

    if (
      (!allowViewportRelease &&
        e.target != mouseDownTarget &&
        !(mouseDownTarget.classList.contains("popupable-clone-container") &&
          e.target === previousPopup?.original))
    ) return
    const original = (allowViewportRelease ? mouseDownTarget.closest("[data-popupable]") : null) || e.target.closest("[data-popupable]")
    if (!original) {
      if (allowViewportRelease) {
        closePopupable()
        return
      }
      if (e.target.closest(".popupable-container")) {
        return
      }
      if (activePopup) {
        if (activePopup.state === "zoomed") {
          activePopup.unzoom()
        } else {
          closePopupable()
        }
      }
      return
    }
    e.preventDefault()

    if (activePopup) {
      closePopupable()
    }

    activePopup = {
      transition: {},
      listeners: []
    }

    const cloneList = document.createElement("div")
    cloneList.className = "popupable-clones"

    const cloneObj = cloneElement(original)
    const { cloneContainer, clone, content } = cloneObj

    let group
    if (original.dataset.popupableGroup) {
      const grouped = document.querySelectorAll(`[data-popupable-group="${original.dataset.popupableGroup}"]`)
      if (grouped.length > 1) {
        group = []
        for (const [i, orig] of grouped.entries()) {
          if (orig === original) {
            group.push(cloneObj)
            group.currentIndex = i
            cloneList.append(cloneContainer)
          } else {
            const clone = cloneElement(orig)
            clone.cloneContainer.style.display = "none"
            clone.cloneContainer.classList.add("popupable-clone-extra")
            group.push(clone)
            cloneList.append(clone.cloneContainer)
          }
        }
      }
    } else {
      cloneList.append(cloneContainer)
    }

    const popup = document.createElement("div")
    popup.className = "popupable-container"
    if (cloneObj.id) {
      popup.id = cloneObj.id
    }
    const viewportLayer = document.createElement("div")
    viewportLayer.className = "popupable-viewport"

    const footer = document.createElement("div")
    footer.classList = "popupable-footer"

    let contentContainer
    if (content) {
      contentContainer = document.createElement("div")
      contentContainer.classList = "popupable-content-container"
      footer.append(contentContainer)
    }

    let header, counter, goNext, goPrev

    if (group) {
      if (cloneObj.counter) {
        header = document.createElement("div")
        header.className = "popupable-header"
        counter = document.createElement("div")
        counter.className = "popupable-counter"
        header.append(counter)
      }

      viewportLayer.innerHTML = `
        <div class="popupable-prev-container${!group.currentIndex ? " popupable-disabled" : ""}">
          <div class="popupable-button popupable-nav-button popupable-prev">
            <svg width="24px" height="24px" viewBox="0 -960 960 960" fill="#fff">
              <path d="m313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z"/>
            </svg>
          </div>
        </div>
        <div class="popupable-next-container${group.currentIndex === group.length - 1 ? " popupable-disabled" : ""}">
          <div class="popupable-button popupable-nav-button popupable-next">
            <svg width="24px" height="24px" viewBox="0 -960 960 960" fill="#fff">
              <path d="M647-440H160v-80h487L423-744l57-56 320 320-320 320-57-56 224-224Z"/>
            </svg>
          </div>
        </div>
      `
      const next = viewportLayer.querySelector(".popupable-next-container")
      const prev = viewportLayer.querySelector(".popupable-prev-container")
      let navHideTimeout, navLastMoveX, navLastMoveY, navHovered
      const hideNavOnInactivity = !(navigator.maxTouchPoints > 0 || window.matchMedia("(hover: none)").matches)

      const scheduleNavHide = () => {
        if (!hideNavOnInactivity) return
        clearTimeout(navHideTimeout)
        if (navHovered) return
        navHideTimeout = setTimeout(() => {
          if (navHovered) return
          next.classList.add("popupable-nav-inactive")
          prev.classList.add("popupable-nav-inactive")
        }, 1500)
      }

      const showNav = () => {
        next.classList.remove("popupable-nav-inactive")
        prev.classList.remove("popupable-nav-inactive")
        scheduleNavHide()
      }

      async function recalculateVisible() {
        const current = group[group.currentIndex]
        await current.ready
        if (group.currentIndex) {
          prev.classList.remove("popupable-disabled")
        } else {
          prev.classList.add("popupable-disabled")
        }
        if (group.currentIndex === group.length - 1) {
          next.classList.add("popupable-disabled")
        } else {
          next.classList.remove("popupable-disabled")
        }
        for (const [i, clone] of group.entries()) {
          const index = i - group.currentIndex
          clone.cloneContainer.style.setProperty("--popupable-offset-multiplier", index)
          clone.cloneContainer.style.zIndex = Math.abs(index) * -1
          if (clone.content) {
            if (!index) {
              clone.content.classList.remove("popupable-content-before")
              clone.content.classList.remove("popupable-content-after")
            } else if (index > 0) {
              clone.content.classList.add("popupable-content-after")
              clone.content.classList.remove("popupable-content-before")
            } else {
              clone.content.classList.add("popupable-content-before")
              clone.content.classList.remove("popupable-content-after")
            }
          }
        }
        if (current.id) {
          popup.id = current.id
        } else {
          popup.removeAttribute("id")
        }
        if (counter) {
          counter.textContent = `${group.currentIndex + 1} / ${group.length}`
        }
        updateExpandedSize()
      }

      goNext = () => {
        if (group.currentIndex >= group.length - 1) return
        group.currentIndex++
        recalculateVisible()
      }

      goPrev = () => {
        if (group.currentIndex <= 0) return
        group.currentIndex--
        recalculateVisible()
      }

      recalculateVisible()
      if (hideNavOnInactivity) {
        scheduleNavHide()
      }

      activePopup.listeners.push(
        {
          target: next,
          event: "click",
          func: () => goNext()
        },
        {
          target: prev,
          event: "click",
          func: () => goPrev()
        },
        {
          target: document,
          event: "keydown",
          func: e => {
            if (activePopup.state === "zoomed") return
            switch (e.key) {
              case "ArrowRight":
              case "ArrowDown":
              case "PageDown":
              case "d":
              case "s":
                goNext()
                break
              case "ArrowLeft":
              case "ArrowUp":
              case "PageUp":
              case "a":
              case "w":
                goPrev()
                break
              case "Home":
                group.currentIndex = 0
                recalculateVisible()
                break
              case "End":
                group.currentIndex = group.length - 1
                recalculateVisible()
                break
              case "0":
              case "1":
              case "2":
              case "3":
              case "4":
              case "5":
              case "6":
              case "7":
              case "8":
              case "9": 
                group.currentIndex = Math.min(Math.max(Number(e.key), 1) - 1, group.length - 1)
                recalculateVisible()
                break
            }
          }
        },
        {
          target: document,
          event: "wheel",
          func: e => {
            if (activePopup.state === "zoomed") return
            if (e.deltaY > 50) {
              goNext()
            } else if (e.deltaY < -50) {
              goPrev()
            }
          },
          args: {
            passive: true
          }
        }
      )

      if (hideNavOnInactivity) {
        activePopup.listeners.push(
          {
            target: next,
            event: "pointerenter",
            func: () => {
              navHovered = true
              showNav()
            }
          },
          {
            target: prev,
            event: "pointerenter",
            func: () => {
              navHovered = true
              showNav()
            }
          },
          {
            target: next,
            event: "pointerleave",
            func: () => {
              navHovered = false
              scheduleNavHide()
            }
          },
          {
            target: prev,
            event: "pointerleave",
            func: () => {
              navHovered = false
              scheduleNavHide()
            }
          }
        )

        activePopup.listeners.push({
          target: popup,
          event: "pointermove",
          func: e => {
            if (activePopup.state === "zoomed") return
            if (navLastMoveX == null || navLastMoveY == null) {
              navLastMoveX = e.clientX
              navLastMoveY = e.clientY
              return
            }
            if (Math.abs(e.clientX - navLastMoveX) < 3 && Math.abs(e.clientY - navLastMoveY) < 3) {
              return
            }
            navLastMoveX = e.clientX
            navLastMoveY = e.clientY
            showNav()
          },
          args: {
            passive: true
          }
        })
      }

      for (const clone of group) {
        if (clone.content) {
          contentContainer.append(clone.content)
        }
      }
    } else {
      if (content) {
        contentContainer.append(content)
      }
    }
    if (header) {
      viewportLayer.append(header)
    }
    viewportLayer.append(footer)
    popup.append(cloneList, viewportLayer)

    Object.assign(activePopup, cloneObj, { popup, group, contentContainer, goNext, goPrev })

    await activePopup.ready

    setCloneToOriginalRect(cloneContainer, original)
    document.body.append(popup)
    original.classList.add("popupable-hide")
    disableScroll()

    const styles = getComputedStyle(popup)
    activePopup.transition.duration = parseFloat(styles.transitionDuration) * 1000 + parseFloat(styles.transitionDelay) * 1000

    popup._state = activePopup

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        openPopupable(popup._state)
      })
    })

    let lastUpAt = 0
    let lastUpWasNav

    if (group) {
      popup.addEventListener("dragstart", e => e.preventDefault())
    }

    popup.addEventListener("pointerup", e => {
      if (popup._state.state === "zoomed") return
      if (e.pointerType === "touch" && activeTouchPointers > 1) return

      const now = performance.now()
      const isNav = e.target.closest(".popupable-next-container, .popupable-prev-container") != null

      if (lastUpWasNav && now - lastUpAt < 250) {
        lastUpAt = now
        return
      }

      if (isNav) {
        lastUpWasNav = true
        lastUpAt = now
      } else {
        lastUpWasNav = false
        lastUpAt = now
      }

      if (
        e.button !== 0 ||
        !(
          ((e.target.classList.contains("popupable-clone") || e.target.classList.contains("popupable-clone-layer")) &&
            mouseDownTarget.classList.contains("popupable-clone-container")) ||
          (e.target == mouseDownTarget &&
            (e.target.closest(".popupable-clone-container") ||
              e.target.classList.contains("popupable-viewport") ||
              e.target.classList.contains("popupable-container"))) ||
          (e.target.classList.contains("popupable-container") &&
            mouseDownTarget === activePopup.original.parentElement)
        )
      ) return

      const state = popup._state
      const current = state.group ? state.group[state.group.currentIndex] : state

      if (state.blocked) {
        state.blocked = false
      }

      if (state.state === "open") {
        requestAnimationFrame(() => {
          if (state.blocked) {
            state.blocked = false
            return
          }

          if (current.zoomable && e.target.classList.contains("popupable-clone")) {
            state.state = "zoomed"
            popup.classList.add("popupable-locked")

            let x, y, scale = 2
            const minScale = 1.5
            const maxScale = 6
            const pointers = new Map()
            let panPointerId, panLastX, panLastY, pinchLastCenterX, pinchLastCenterY, pinchLastDistance
            let tapTarget, tapStartX, tapStartY, tapMoved

            const rect = current.cloneContainer.getBoundingClientRect()
            x = (e.clientX - rect.left) * (1 - scale)
            y = (e.clientY - rect.top) * (1 - scale)

            const render = () => current.cloneContainer.style.transform = `translate(${x}px, ${y}px) scale(${scale})`

            const clamp = value => Math.min(maxScale, Math.max(minScale, value))

            function zoomAt(targetScale, centerX, centerY) {
              const prevScale = scale
              scale = clamp(targetScale)
              if (scale === prevScale) return false
              const rect = current.cloneContainer.getBoundingClientRect()
              const ratio = scale / prevScale
              const px = centerX - rect.left
              const py = centerY - rect.top
              x = x + px * (1 - ratio)
              y = y + py * (1 - ratio)
              return true
            }

            function syncGestureState() {
              if (pointers.size === 1) {
                const pointer = pointers.values().next().value
                panPointerId = pointer.id
                panLastX = pointer.x
                panLastY = pointer.y
                pinchLastCenterX = null
                pinchLastCenterY = null
                pinchLastDistance = null
                return
              }

              if (pointers.size >= 2) {
                panPointerId = null
                const [p1, p2] = [...pointers.values()]
                pinchLastCenterX = (p1.x + p2.x) / 2
                pinchLastCenterY = (p1.y + p2.y) / 2
                pinchLastDistance = Math.hypot(p2.x - p1.x, p2.y - p1.y)
                return
              }

              panPointerId = null
              panLastX = null
              panLastY = null
              pinchLastCenterX = null
              pinchLastCenterY = null
              pinchLastDistance = null
            }

            current.cloneContainer.classList.add("popupable-zoomed")
            render()

            state.unzoom = () => {
              state.state = "open"
              popup.classList.remove("popupable-locked")

              for (const pointerId of pointers.keys()) {
                if (popup.hasPointerCapture(pointerId)) {
                  popup.releasePointerCapture(pointerId)
                }
              }

              pointers.clear()
              current.cloneContainer.classList.remove("popupable-zoomed")
              current.cloneContainer.style.transition = null
              current.cloneContainer.style.transform = null

              for (const listener of state.zoomListeners) {
                listener.target.removeEventListener(listener.event, listener.func)
              }
            }

            state.zoomListeners = [
              {
                target: popup,
                event: "pointerdown",
                func: e => {
                  if (e.button !== 0) return
                  current.cloneContainer.style.transition = "none"
                  popup.setPointerCapture(e.pointerId)
                  pointers.set(e.pointerId, {
                    id: e.pointerId,
                    x: e.clientX,
                    y: e.clientY
                  })

                  if (pointers.size === 1) {
                    tapTarget = e.target
                    tapStartX = e.clientX
                    tapStartY = e.clientY
                    tapMoved = false
                  } else {
                    tapMoved = true
                  }

                  syncGestureState()
                  e.preventDefault()
                }
              },
              {
                target: popup,
                event: "pointermove",
                func: e => {
                  const pointer = pointers.get(e.pointerId)
                  if (!pointer) return

                  pointer.x = e.clientX
                  pointer.y = e.clientY

                  if (!tapMoved && (Math.abs(e.clientX - tapStartX) > 3 || Math.abs(e.clientY - tapStartY) > 3)) {
                    tapMoved = true
                  }

                  if (pointers.size === 1 && panPointerId === e.pointerId) {
                    const dx = e.clientX - panLastX
                    const dy = e.clientY - panLastY
                    if (!dx && !dy) return
                    x += dx
                    y += dy
                    panLastX = e.clientX
                    panLastY = e.clientY
                    render()
                    return
                  }

                  if (pointers.size >= 2) {
                    const [p1, p2] = [...pointers.values()]
                    const centerX = (p1.x + p2.x) / 2
                    const centerY = (p1.y + p2.y) / 2
                    const distance = Math.hypot(p2.x - p1.x, p2.y - p1.y)

                    if (!pinchLastDistance) {
                      pinchLastCenterX = centerX
                      pinchLastCenterY = centerY
                      pinchLastDistance = distance
                      return
                    }

                    x += centerX - pinchLastCenterX
                    y += centerY - pinchLastCenterY
                    zoomAt(scale * (distance / pinchLastDistance), centerX, centerY)

                    pinchLastCenterX = centerX
                    pinchLastCenterY = centerY
                    pinchLastDistance = distance
                    render()
                  }
                }
              },
              {
                target: popup,
                event: "pointerup",
                func: e => {
                  if (!pointers.has(e.pointerId)) return

                  pointers.delete(e.pointerId)
                  if (popup.hasPointerCapture(e.pointerId)) {
                    popup.releasePointerCapture(e.pointerId)
                  }

                  if (!pointers.size && !tapMoved && Math.abs(e.clientX - tapStartX) < 3 && Math.abs(e.clientY - tapStartY) < 3) {
                    const clickedClone = tapTarget?.closest?.(".popupable-clone-container") === current.cloneContainer
                    const clickedBackground = tapTarget === popup || tapTarget === viewportLayer
                    if (clickedClone || clickedBackground) {
                      state.unzoom()
                      return
                    }
                  }

                  syncGestureState()
                }
              },
              {
                target: popup,
                event: "pointercancel",
                func: e => {
                  if (!pointers.has(e.pointerId)) return
                  pointers.delete(e.pointerId)
                  if (popup.hasPointerCapture(e.pointerId)) {
                    popup.releasePointerCapture(e.pointerId)
                  }
                  syncGestureState()
                }
              },
              {
                target: popup,
                event: "wheel",
                func: e => {
                  current.cloneContainer.style.transition = "none"
                  if (zoomAt(scale * Math.exp(-e.deltaY * 0.002), e.clientX, e.clientY)) {
                    render()
                  }
                },
                args: {
                  passive: true
                }
              }
            ]

            for (const listener of state.zoomListeners) {
              listener.target.addEventListener(listener.event, listener.func, listener.args)
            }

            return
          }
          closePopupable()
        })
        return
      }

      e.stopPropagation()

      if (activePopup !== state) {
        closePopupable()
        activePopup = state
      }

      openPopupable(activePopup)
    })
  })

  document.addEventListener("pointercancel", e => {
    if (e.pointerType === "touch") {
      activeTouchPointers = Math.max(0, activeTouchPointers - 1)
    }
  })

  document.addEventListener("keydown", e => {
    if (e.key === "Escape" || e.key === "Backspace" || e.key === " " || e.key === "Delete") {
      if (activePopup.state === "zoomed") {
        activePopup.unzoom()
        return
      }
      closePopupable()
    }
  })

  window.addEventListener("resize", updateExpandedSize)
  if (visualViewport) {
    visualViewport.addEventListener("resize", updateExpandedSize)
  }
}
