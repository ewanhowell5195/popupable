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

    const rect = original.getBoundingClientRect()
    cloneContainer.style.top = visualViewport.offsetTop + rect.top + "px"
    cloneContainer.style.left = visualViewport.offsetLeft + rect.left + "px"
    cloneContainer.style.width = rect.width + "px"
    cloneContainer.style.height = rect.height + "px"

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

    document.documentElement.style.setProperty("--popupable-view-width", visualViewport.width + "px")

    const padding = parseFloat(getComputedStyle(activePopup.popup).getPropertyValue("--popupable-screen-padding")) || 0

    const maxW = Math.max(0, visualViewport.width - padding * 2)
    const maxH = visualViewport.height - padding * 2

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

      let cloneMaxH = maxH

      if (clone.content) {
        cloneMaxH -= clone.content.getBoundingClientRect().height
      }

      cloneMaxH = Math.max(0, cloneMaxH)

      let finalW = maxW
      let finalH = finalW / aspect

      if (finalH > cloneMaxH) {
        finalH = cloneMaxH
        finalW = finalH * aspect
      }

      clone.cloneContainer.style.top = visualViewport.offsetTop + padding + (cloneMaxH - finalH) / 2 + "px"
      clone.cloneContainer.style.left = visualViewport.offsetLeft + padding + (maxW - finalW) / 2 + "px"
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
      activePopup.contentContainer.style.height = rect.height + "px"
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

  let dragging, downX, downY


  document.addEventListener("pointerdown", e => {
    if (e.button !== 0) return
    mouseDownTarget = e.target

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

    let dragged
    if (dragging) {
      dragging = false
      dragged = true
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

    if (
      (e.target != mouseDownTarget &&
        !(mouseDownTarget.classList.contains("popupable-clone-container") &&
          e.target === previousPopup?.original))
    ) return
    const original = e.target.closest("[data-popupable]")
    if (!original) {
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

    const footer = document.createElement("div")
    footer.classList = "popupable-footer"

    let contentContainer
    if (content) {
      contentContainer = document.createElement("div")
      contentContainer.classList = "popupable-content-container"
      footer.append(contentContainer)
    }

    let goNext, goPrev

    if (group) {
      popup.innerHTML = `
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
      const next = popup.querySelector(".popupable-next-container")
      const prev = popup.querySelector(".popupable-prev-container")

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
    popup.append(cloneList, footer)

    Object.assign(activePopup, cloneObj, { popup, group, contentContainer, goNext, goPrev })

    await activePopup.ready

    const rect = original.getBoundingClientRect()
    cloneContainer.style.top = visualViewport.offsetTop + rect.top + "px"
    cloneContainer.style.left = visualViewport.offsetLeft + rect.left + "px"
    cloneContainer.style.width = rect.width + "px"
    cloneContainer.style.height = rect.height + "px"
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
            
            let scale = 2
            const minScale = 1.5
            const maxScale = 6
            let startX, startY, downX, downY, clickOutside, pinchStartDistance, pinchStartScale
            let dragging = false

            const rect = current.cloneContainer.getBoundingClientRect()
            const tx = (e.clientX - rect.left) * (1 - scale)
            const ty = (e.clientY - rect.top) * (1 - scale)
            current.cloneContainer.classList.add("popupable-zoomed")
            current.cloneContainer.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`

            let lastX = tx
            let lastY = ty

            state.unzoom = () => {
              state.state = "open"
              popup.classList.remove("popupable-locked")

              current.cloneContainer.classList.remove("popupable-zoomed")
              current.cloneContainer.style.transform = null
              current.cloneContainer.style.transition = null

              for (const listener of state.zoomListeners) {
                listener.target.removeEventListener(listener.event, listener.func)
              }
            }

            state.zoomListeners = [
              {
                target: current.cloneContainer.parentElement.parentElement,
                event: "pointerdown",
                func: e => {
                  if (e.button !== 0 || e.target !== current.cloneContainer.parentElement.parentElement) return
                  clickOutside = true
                }
              },
              {
                target: current.cloneContainer,
                event: "pointerdown",
                func: e => {
                  if (dragging || e.button !== 0) return
                  dragging = true
                  current.cloneContainer.style.transition = "none"
                  startX = e.clientX - lastX
                  startY = e.clientY - lastY
                  downX = e.clientX
                  downY = e.clientY
                  e.preventDefault()
                }
              },
              {
                target: document,
                event: "mousemove",
                func: e => {
                  if (!dragging) return
                  lastX = e.clientX - startX
                  lastY = e.clientY - startY
                  current.cloneContainer.style.transform = `translate(${lastX}px, ${lastY}px) scale(${scale})`
                }
              },
              {
                target: document,
                event: "touchmove",
                func: e => {
                  if (!dragging) return

                  if (e.touches.length === 1) {
                    const t = e.touches[0]
                    lastX = t.clientX - startX
                    lastY = t.clientY - startY
                  }

                  if (e.touches.length === 2) {
                    const t1 = e.touches[0]
                    const t2 = e.touches[1]

                    const dx = t2.clientX - t1.clientX
                    const dy = t2.clientY - t1.clientY
                    const distance = Math.hypot(dx, dy)

                    if (!pinchStartDistance) {
                      pinchStartDistance = distance
                      pinchStartScale = scale
                      return
                    }

                    const ratio = distance / pinchStartDistance
                    const prevScale = scale

                    scale = Math.min(
                      maxScale,
                      Math.max(minScale, pinchStartScale * ratio)
                    )

                    if (scale !== prevScale) {
                      const rect = current.cloneContainer.getBoundingClientRect()

                      const centerX = (t1.clientX + t2.clientX) / 2
                      const centerY = (t1.clientY + t2.clientY) / 2

                      const px = centerX - rect.left
                      const py = centerY - rect.top

                      const scaleRatio = scale / prevScale

                      lastX = lastX + px * (1 - scaleRatio)
                      lastY = lastY + py * (1 - scaleRatio)
                    }
                  }

                  current.cloneContainer.style.transform =
                    `translate(${lastX}px, ${lastY}px) scale(${scale})`
                },
                args: {
                  passive: true
                }
              },
              {
                target: document,
                event: "pointerup",
                func: e => {
                  if (e.target === current.cloneContainer.parentElement.parentElement && clickOutside) {
                    clickOutside = false
                    state.unzoom()
                    return
                  }
                  
                  dragging = false
                  clickOutside = false
                  pinchStartDistance = null
                  pinchStartScale = null

                  const dx = e.clientX - downX
                  const dy = e.clientY - downY

                  if (Math.abs(dx) < 3 && Math.abs(dy) < 3) {
                    state.unzoom()
                  }
                }
              },
              {
                target: document,
                event: "wheel",
                func: e => {
                  current.cloneContainer.style.transition = "initial"
                  const prevScale = scale
                  const speed = 0.003

                  scale = Math.min(
                    maxScale,
                    Math.max(minScale, scale - e.deltaY * speed)
                  )

                  if (scale === prevScale) return

                  const rect = current.cloneContainer.getBoundingClientRect()
                  const ratio = scale / prevScale

                  const px = e.clientX - rect.left
                  const py = e.clientY - rect.top

                  lastX = lastX + px * (1 - ratio)
                  lastY = lastY + py * (1 - ratio)

                  current.cloneContainer.style.transform = `translate(${lastX}px, ${lastY}px) scale(${scale})`
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
}