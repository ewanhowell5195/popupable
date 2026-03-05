{
  let activePopup, previousPopup, mouseDownTarget, popupLoadToken = 0
  const DRAG_THRESHOLD = 3

  let hapticLabel
  function triggerHaptic() {
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate([10])
      return
    }
    if (!hapticLabel) {
      hapticLabel = document.createElement("label")
      hapticLabel.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0;pointer-events:none"
      const hapticInput = document.createElement("input")
      hapticInput.type = "checkbox"
      hapticInput.setAttribute("switch", "")
      hapticLabel.append(hapticInput)
      document.body.append(hapticLabel)
    }
    hapticLabel.click()
  }

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
    triggerHaptic()

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
    popupLoadToken++
    activePopup.state = "close"

    const { cloneContainer, clone, original, popup, transition, group, listeners } = activePopup

    original.classList.remove("popupable-loading")
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
      const thumbnailHeight = activePopup.thumbnailsContainer ? activePopup.thumbnailsContainer.getBoundingClientRect().height / uiScale : 0
      const topReserved = (activePopup.orderPlacement.counterTop ? counterHeight : 0) + (activePopup.orderPlacement.contentTop ? contentHeight : 0) + (activePopup.orderPlacement.thumbnailsTop ? thumbnailHeight : 0)
      const bottomReserved = (activePopup.orderPlacement.counterBottom ? counterHeight : 0) + (activePopup.orderPlacement.contentBottom ? contentHeight : 0) + (activePopup.orderPlacement.thumbnailsBottom ? thumbnailHeight : 0)
      const constrainedMaxH = Math.max(0, viewportHeight - topReserved - bottomReserved - padding * 2)

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
      const maxTop = viewportOffsetTop + viewportHeight - bottomReserved - padding - finalH
      finalTop = Math.min(finalTop, maxTop)
      finalTop = Math.max(finalTop, viewportOffsetTop + topReserved + padding)

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

  function parsePopupableOrder(value) {
    const defaultOrder = ["counter", "image", "content", "thumbnails"]
    const allowed = new Set(defaultOrder)
    const order = []

    if (value) {
      for (const part of value.split(",")) {
        const token = part.trim().toLowerCase()
        if (!token || !allowed.has(token) || order.includes(token)) continue
        order.push(token)
      }
    }

    for (const token of defaultOrder) {
      if (!order.includes(token)) {
        order.push(token)
      }
    }

    const imageIndex = order.indexOf("image")
    return {
      top: order.slice(0, imageIndex),
      bottom: order.slice(imageIndex + 1)
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
      thumbnails: original.hasAttribute("data-popupable-thumbnails"),
      order: parsePopupableOrder(original.dataset.popupableOrder),
      ready: Promise.all([clone, cloneLayer].filter(Boolean).map(img =>
        img.decode().catch(() => {})
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
      downX = e.clientX
      downY = e.clientY
    }

    if (dragging || activePopup?.state !== "open") return
    if (e.target.closest(".popupable-header, .popupable-footer")) return
    dragging = true
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
      const dy = e.clientY - downY
      const dya = Math.abs(dy)
      if (e.pointerType === "touch" && dya > 56 && dya > dxa * 1.1) {
        closePopupable()
        return
      }
      if (activePopup.group && dxa > DRAG_THRESHOLD) {
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
          e.target === previousPopup?.original) &&
        !(mouseDownTarget.closest(".popupable-container") && !e.target.closest(".popupable-container"))) ||
      Math.abs(e.clientX - downX) > DRAG_THRESHOLD || Math.abs(e.clientY - downY) > DRAG_THRESHOLD
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

    if (activePopup?.original === original && activePopup.popup && !activePopup.popup.isConnected && activePopup.state !== "close") {
      return
    }

    const loadToken = ++popupLoadToken

    if (activePopup) {
      closePopupable()
    }

    activePopup = {
      transition: {},
      listeners: []
    }
    const popupState = activePopup

    const cloneList = document.createElement("div")
    cloneList.className = "popupable-clones"

    const cloneObj = cloneElement(original)
    const { cloneContainer, clone, content } = cloneObj

    let group
    if (original.dataset.popupableGroup) {
      const grouped = document.querySelectorAll(`[data-popupable-group="${original.dataset.popupableGroup}"]`)
      if (grouped.length) {
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

    let contentContainer
    if (content) {
      contentContainer = document.createElement("div")
      contentContainer.classList = "popupable-content-container"
    }

    let header, footer, counter, thumbnailsContainer, thumbnailItems, hasPositionedThumbnails, goNext, goPrev, lastWheelNavAt
    const orderPlacement = {}

    if (group) {
      if (cloneObj.counter) {
        header = document.createElement("div")
        header.className = "popupable-header"
        counter = document.createElement("div")
        counter.className = "popupable-counter"
        header.append(counter)
      }
      if (cloneObj.thumbnails) {
        thumbnailsContainer = document.createElement("div")
        thumbnailsContainer.className = "popupable-thumbnails"
        thumbnailItems = group.map((entry, i) => {
          const thumbnail = new Image()
          thumbnail.className = "popupable-thumbnail"
          thumbnail.src = entry.original.currentSrc ?? entry.original.src
          thumbnail.dataset.thumbnailIndex = i
          thumbnailsContainer.append(thumbnail)
          return thumbnail
        })
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

      function scheduleNavHide() {
        if (!hideNavOnInactivity) return
        clearTimeout(navHideTimeout)
        if (navHovered) return
        navHideTimeout = setTimeout(() => {
          if (navHovered) return
          next.classList.add("popupable-nav-inactive")
          prev.classList.add("popupable-nav-inactive")
        }, 1500)
      }

      function showNav() {
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
        if (thumbnailItems) {
          for (const [i, thumbnail] of thumbnailItems.entries()) {
            thumbnail.classList.toggle("popupable-thumbnail-active", i === group.currentIndex)
          }
          const activeThumbnail = thumbnailItems[group.currentIndex]
          requestAnimationFrame(() => {
            if (!activeThumbnail || !thumbnailsContainer?.isConnected) return

            const styles = getComputedStyle(thumbnailsContainer)
            const paddingLeft = parseFloat(styles.paddingLeft) || 0
            const paddingRight = parseFloat(styles.paddingRight) || 0
            const visibleLeft = thumbnailsContainer.scrollLeft + paddingLeft
            const visibleRight = thumbnailsContainer.scrollLeft + thumbnailsContainer.clientWidth - paddingRight
            const thumbLeft = activeThumbnail.offsetLeft
            const thumbRight = thumbLeft + activeThumbnail.offsetWidth

            let nextScrollLeft = thumbnailsContainer.scrollLeft
            if (thumbLeft < visibleLeft) {
              nextScrollLeft = Math.max(0, thumbLeft - paddingLeft)
            } else if (thumbRight > visibleRight) {
              nextScrollLeft = thumbRight - thumbnailsContainer.clientWidth + paddingRight
            }

            if (nextScrollLeft !== thumbnailsContainer.scrollLeft) {
              if (hasPositionedThumbnails) {
                thumbnailsContainer.scrollTo({ left: nextScrollLeft, behavior: "smooth" })
              } else {
                thumbnailsContainer.scrollLeft = nextScrollLeft
              }
            }
            hasPositionedThumbnails = true
          })
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
            const now = performance.now()
            if (now - (lastWheelNavAt || 0) < 80) return
            if (e.deltaY > 50) {
              lastWheelNavAt = now
              goNext()
            } else if (e.deltaY < -50) {
              lastWheelNavAt = now
              goPrev()
            }
          },
          args: {
            passive: true
          }
        }
      )

      if (thumbnailsContainer) {
        let thumbnailsDragging, thumbnailsDragMoved, thumbnailsShowDraggingClass, thumbnailsStartX, thumbnailsStartScrollLeft, thumbnailsLastScrollLeft, thumbnailsLastAt, thumbnailsVelocity, thumbnailsMomentumRaf

        function stopThumbnailsMomentum() {
          if (thumbnailsMomentumRaf) {
            cancelAnimationFrame(thumbnailsMomentumRaf)
            thumbnailsMomentumRaf = null
          }
        }

        function startThumbnailsMomentum() {
          const startThreshold = 0.01
          const stopThreshold = 0.002
          const friction = 0.8
          const edgeEpsilon = 0.1

          stopThumbnailsMomentum()
          if (Math.abs(thumbnailsVelocity) < startThreshold) return

          let lastFrameAt = performance.now()
          function step(now) {
            if (!thumbnailsContainer.isConnected) {
              stopThumbnailsMomentum()
              return
            }

            const maxScroll = thumbnailsContainer.scrollWidth - thumbnailsContainer.clientWidth
            if (maxScroll <= 0) {
              stopThumbnailsMomentum()
              return
            }

            const dt = Math.min(32, now - lastFrameAt)
            lastFrameAt = now

            let nextScrollLeft = thumbnailsContainer.scrollLeft + thumbnailsVelocity * dt
            if (nextScrollLeft < 0) nextScrollLeft = 0
            if (nextScrollLeft > maxScroll) nextScrollLeft = maxScroll
            thumbnailsContainer.scrollLeft = nextScrollLeft

            if (
              (thumbnailsContainer.scrollLeft <= edgeEpsilon && thumbnailsVelocity < 0) ||
              (thumbnailsContainer.scrollLeft >= maxScroll - edgeEpsilon && thumbnailsVelocity > 0)
            ) {
              stopThumbnailsMomentum()
              return
            }

            thumbnailsVelocity *= Math.pow(friction, dt / 16.67)
            if (Math.abs(thumbnailsVelocity) <= stopThreshold) {
              stopThumbnailsMomentum()
              return
            }

            thumbnailsMomentumRaf = requestAnimationFrame(step)
          }

          thumbnailsMomentumRaf = requestAnimationFrame(step)
        }

        activePopup.listeners.push(
          {
            target: thumbnailsContainer,
            event: "pointerdown",
            func: e => {
              if (e.button !== 0) return
              const maxScroll = thumbnailsContainer.scrollWidth - thumbnailsContainer.clientWidth
              thumbnailsShowDraggingClass = maxScroll > 0
              stopThumbnailsMomentum()
              thumbnailsDragging = true
              thumbnailsDragMoved = false
              thumbnailsStartX = e.clientX
              thumbnailsStartScrollLeft = thumbnailsContainer.scrollLeft
              thumbnailsLastScrollLeft = thumbnailsContainer.scrollLeft
              thumbnailsLastAt = performance.now()
              thumbnailsVelocity = 0
              if (thumbnailsShowDraggingClass) {
                thumbnailsContainer.classList.add("popupable-thumbnails-dragging")
              }
              thumbnailsContainer.setPointerCapture(e.pointerId)
            }
          },
          {
            target: thumbnailsContainer,
            event: "pointermove",
            func: e => {
              if (!thumbnailsDragging) return
              const deltaX = e.clientX - thumbnailsStartX
              if (Math.abs(deltaX) > DRAG_THRESHOLD) {
                thumbnailsDragMoved = true
              }
              const now = performance.now()
              const dt = now - thumbnailsLastAt
              const nextScrollLeft = thumbnailsStartScrollLeft - deltaX
              thumbnailsContainer.scrollLeft = nextScrollLeft
              if (dt > 0) {
                const currentVelocity = (thumbnailsContainer.scrollLeft - thumbnailsLastScrollLeft) / dt
                thumbnailsVelocity = thumbnailsVelocity * 0.65 + currentVelocity * 0.35
                thumbnailsLastScrollLeft = thumbnailsContainer.scrollLeft
                thumbnailsLastAt = now
              }
            }
          },
          {
            target: thumbnailsContainer,
            event: "pointerup",
            func: e => {
              if (!thumbnailsDragging) return
              thumbnailsDragging = false
              if (thumbnailsShowDraggingClass) {
                thumbnailsContainer.classList.remove("popupable-thumbnails-dragging")
              }
              if (thumbnailsContainer.hasPointerCapture(e.pointerId)) {
                thumbnailsContainer.releasePointerCapture(e.pointerId)
              }
              if (thumbnailsDragMoved) {
                if (performance.now() - thumbnailsLastAt > 10) {
                  thumbnailsVelocity = 0
                }
                startThumbnailsMomentum()
                return
              }

              const thumbnail = document.elementFromPoint(e.clientX, e.clientY)?.closest?.(".popupable-thumbnail")
              if (!thumbnail) return
              group.currentIndex = Number(thumbnail.dataset.thumbnailIndex)
              recalculateVisible()
            }
          },
          {
            target: thumbnailsContainer,
            event: "pointercancel",
            func: e => {
              if (!thumbnailsDragging) return
              thumbnailsDragging = false
              if (thumbnailsShowDraggingClass) {
                thumbnailsContainer.classList.remove("popupable-thumbnails-dragging")
              }
              if (thumbnailsContainer.hasPointerCapture(e.pointerId)) {
                thumbnailsContainer.releasePointerCapture(e.pointerId)
              }
              stopThumbnailsMomentum()
            }
          },
          {
            target: thumbnailsContainer,
            event: "wheel",
            func: e => {
              e.stopPropagation()
              e.preventDefault()
              const maxScroll = thumbnailsContainer.scrollWidth - thumbnailsContainer.clientWidth
              if (maxScroll <= 0) return

              const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
              const atStart = thumbnailsContainer.scrollLeft <= 0.1
              const atEnd = thumbnailsContainer.scrollLeft >= maxScroll - 0.1
              if ((atStart && delta < 0) || (atEnd && delta > 0)) return
              if (atStart && delta > 0 && thumbnailsVelocity < 0) thumbnailsVelocity = 0
              if (atEnd && delta < 0 && thumbnailsVelocity > 0) thumbnailsVelocity = 0

              const impulse = delta * 0.015
              thumbnailsVelocity = (thumbnailsVelocity || 0) + impulse
              if (!thumbnailsMomentumRaf) {
                startThumbnailsMomentum()
              }
            },
            args: {
              passive: false
            }
          }
        )
      }

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
            if (Math.abs(e.clientX - navLastMoveX) < DRAG_THRESHOLD && Math.abs(e.clientY - navLastMoveY) < DRAG_THRESHOLD) {
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
        if (clone.content && contentContainer) {
          contentContainer.append(clone.content)
        }
      }
    } else {
      if (content) {
        contentContainer.append(content)
      }
    }

    const enabledOrderItems = {
      counter: !!counter,
      content: !!contentContainer,
      thumbnails: !!thumbnailsContainer
    }

    const topOrder = cloneObj.order.top.filter(token => enabledOrderItems[token])
    const bottomOrder = cloneObj.order.bottom.filter(token => enabledOrderItems[token])

    if (topOrder.length) {
      header = document.createElement("div")
      header.className = "popupable-header"
    }

    if (bottomOrder.length) {
      footer = document.createElement("div")
      footer.className = "popupable-footer"
    }

    function appendOrderedUiItem(container, token) {
      if (!container) return
      if (token === "counter" && counter) {
        orderPlacement[container === header ? "counterTop" : "counterBottom"] = true
        container.append(counter)
      } else if (token === "content" && contentContainer) {
        orderPlacement[container === header ? "contentTop" : "contentBottom"] = true
        container.append(contentContainer)
      } else if (token === "thumbnails" && thumbnailsContainer) {
        orderPlacement[container === header ? "thumbnailsTop" : "thumbnailsBottom"] = true
        container.append(thumbnailsContainer)
      }
    }

    for (const token of topOrder) {
      appendOrderedUiItem(header, token)
    }

    for (const token of bottomOrder) {
      appendOrderedUiItem(footer, token)
    }

    if (header) viewportLayer.append(header)
    if (footer) viewportLayer.append(footer)
    popup.append(cloneList, viewportLayer)

    Object.assign(popupState, cloneObj, { popup, group, contentContainer, thumbnailsContainer, orderPlacement, goNext, goPrev })

    const loadingTimer = setTimeout(() => {
      if (loadToken === popupLoadToken) original.classList.add("popupable-loading")
    }, 250)
    await popupState.ready
    clearTimeout(loadingTimer)
    original.classList.remove("popupable-loading")
    if (loadToken !== popupLoadToken || activePopup !== popupState || popupState.state === "close") {
      return
    }

    setCloneToOriginalRect(cloneContainer, original)
    document.body.append(popup)
    original.classList.add("popupable-hide")
    disableScroll()

    const styles = getComputedStyle(popup)
    popupState.transition.duration = parseFloat(styles.transitionDuration) * 1000 + parseFloat(styles.transitionDelay) * 1000

    popup._state = popupState

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

    const openTouchPointers = new Map()

    function enterZoom(state, current, event, initialScale, initialPointers = []) {
      if (state.state !== "open") return

      let swipeOffsetX = 0
      const swipeLayer = current.cloneContainer.parentElement
      const swipeTransform = swipeLayer.style.transform
      if (swipeTransform) {
        const match = swipeTransform.match(/translateX\((-?\d+(?:\.\d+)?)px\)/)
        if (match) {
          swipeOffsetX = Number(match[1]) || 0
        }
      }
      const hasSwipeOffset = Math.abs(swipeOffsetX) > 0.5

      dragging = false
      if (hasSwipeOffset) {
        current.cloneContainer.style.translate = "0 0"
        current.cloneContainer.style.transition = "translate var(--popupable-switch-duration), transform 0s"
        swipeLayer.style.transition = null
        swipeLayer.style.transform = null
        current.cloneContainer.style.translate = `${swipeOffsetX}px 0`
      } else {
        swipeLayer.style.transition = null
        swipeLayer.style.transform = null
      }
      state.state = "zoomed"
      popup.classList.add("popupable-locked")

      let x, y, scale = initialScale
      const minScale = 1
      const maxScale = 6
      const pointers = new Map()
      let panPointerId, panLastX, panLastY, pinchLastCenterX, pinchLastCenterY, pinchLastDistance
      let tapTarget, tapStartX, tapStartY, tapMoved
      let usedPinchZoom = false

      const rect = current.cloneContainer.getBoundingClientRect()
      const startX = event?.clientX ?? rect.left + rect.width / 2
      const startY = event?.clientY ?? rect.top + rect.height / 2
      x = (startX - rect.left) * (1 - scale)
      y = (startY - rect.top) * (1 - scale)

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

      if (initialPointers.length) {
        if (!hasSwipeOffset) {
          current.cloneContainer.style.transition = "none"
        }
        tapMoved = true
        for (const pointer of initialPointers) {
          pointers.set(pointer.id, {
            id: pointer.id,
            x: pointer.x,
            y: pointer.y
          })
          popup.setPointerCapture(pointer.id)
        }
        syncGestureState()
      }

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
        current.cloneContainer.style.translate = null

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

            if (!tapMoved && (Math.abs(e.clientX - tapStartX) > DRAG_THRESHOLD || Math.abs(e.clientY - tapStartY) > DRAG_THRESHOLD)) {
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
              usedPinchZoom = true

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

            if (usedPinchZoom && scale <= 1.01 && pointers.size < 2) {
              state.skipOpenTouchPointerUps = pointers.size
              state.unzoom()
              return
            }

            if (!pointers.size && !tapMoved && Math.abs(e.clientX - tapStartX) < DRAG_THRESHOLD && Math.abs(e.clientY - tapStartY) < DRAG_THRESHOLD) {
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
    }

    activePopup.listeners.push(
      {
        target: popup,
        event: "pointerdown",
        func: e => {
          if (popup._state.state !== "open" || e.pointerType !== "touch") return
          const state = popup._state
          const current = state.group ? state.group[state.group.currentIndex] : state
          if (e.target.closest(".popupable-clone-container") !== current.cloneContainer) return

          openTouchPointers.set(e.pointerId, {
            id: e.pointerId,
            x: e.clientX,
            y: e.clientY
          })

          if (openTouchPointers.size >= 2) {
            enterZoom(state, current, e, 1, [...openTouchPointers.values()].slice(0, 2))
            openTouchPointers.clear()
            e.preventDefault()
          }
        }
      },
      {
        target: popup,
        event: "pointermove",
        func: e => {
          const pointer = openTouchPointers.get(e.pointerId)
          if (!pointer) return
          pointer.x = e.clientX
          pointer.y = e.clientY
        }
      },
      {
        target: popup,
        event: "pointerup",
        func: e => {
          openTouchPointers.delete(e.pointerId)
        }
      },
      {
        target: popup,
        event: "pointercancel",
        func: e => {
          openTouchPointers.delete(e.pointerId)
        }
      }
    )

    popup.addEventListener("pointerup", e => {
      if (popup._state.state === "zoomed") return
      if (e.pointerType === "touch" && activeTouchPointers > 1) return
      if (e.pointerType === "touch" && (popup._state.skipOpenTouchPointerUps || 0) > 0) {
        popup._state.skipOpenTouchPointerUps--
        return
      }

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

          if (current.zoomable && (e.target.classList.contains("popupable-clone") || e.target.classList.contains("popupable-clone-layer"))) {
            enterZoom(state, current, e, 2)
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
