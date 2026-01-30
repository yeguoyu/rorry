// 目录
document.addEventListener("DOMContentLoaded", function () {
  const tocLists = document.querySelectorAll("#toc-list");
  const tocToggles = document.querySelectorAll(".toc-toggle");
  const toggleIcons = document.querySelectorAll("#toc-toggle-text"); 
  const headings = document.querySelectorAll(".text-base h2");

  if (!tocLists.length || !headings.length) return;

  const offset = 30;

  tocLists.forEach(tocList => {
    const fragment = document.createDocumentFragment();

    headings.forEach((heading, i) => {
      const anchorId = `toc-heading-${i}`;
      heading.id = anchorId;

      const li = document.createElement("li");
      const link = document.createElement("a");
      link.href = `#${anchorId}`;
      link.textContent = heading.textContent;

      li.appendChild(link);
      fragment.appendChild(li);
    });

    tocList.appendChild(fragment);

    tocList.addEventListener("click", function (e) {
      if (e.target.tagName.toLowerCase() === 'a') {
        e.preventDefault();
        const targetId = e.target.getAttribute('href').substring(1);
        const target = document.getElementById(targetId);
        if (target) {
          const targetY = target.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top: targetY, behavior: "smooth" });
        }
      }
    });
  });

  tocToggles.forEach((toggle, index) => {
    toggle.addEventListener("click", function () {
      const tocList = tocLists[index];
      const toggleIcon = toggleIcons[index];
      if (!tocList || !toggleIcon) return;
      const isHidden = tocList.classList.toggle("hidden");

      toggleIcon.innerHTML = isHidden 
        ? `<svg t="1745745170194" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path d="M512 66.56c-246.00576 0-445.44 199.42912-445.44 445.44s199.43424 445.44 445.44 445.44 445.44-199.42912 445.44-445.44-199.43424-445.44-445.44-445.44z m0 830.13632c-212.1216 0-384.6912-172.57472-384.6912-384.69632S299.8784 127.30368 512 127.30368c212.13184 0 384.70656 172.57984 384.70656 384.69632S724.13184 896.69632 512 896.69632z" fill="#333333"></path><path d="M395.72992 602.18368L512.1536 476.70272l116.72064 122.81856c12.02688 9.984 31.2576 9.66144 42.94656-0.70144 11.68896-10.36288 11.42784-26.84928-0.60416-36.82304l-138.48576-140.88704c-12.03712-9.97888-31.26272-9.66144-42.95168 0.70144l-137.6 144.25088c-11.68384 10.36288-11.42784 26.84416 0.59904 36.82816 12.03712 9.97888 31.26784 9.66144 42.95168-0.70656z" fill="#0B1956"></path></svg>`
        : `<svg t="1745745170194" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path d="M512 66.56c-246.00576 0-445.44 199.42912-445.44 445.44s199.43424 445.44 445.44 445.44 445.44-199.42912 445.44-445.44-199.43424-445.44-445.44-445.44z m0 830.13632c-212.1216 0-384.6912-172.57472-384.6912-384.69632S299.8784 127.30368 512 127.30368c212.13184 0 384.70656 172.57984 384.70656 384.69632S724.13184 896.69632 512 896.69632z" fill="#333333"></path><path d="M628.27008 421.81632L511.8464 547.29728 395.12576 424.47872c-12.02688-9.984-31.2576-9.66144-42.94656 0.70144-11.68896 10.36288-11.42784 26.84928 0.60416 36.82304l138.48576 140.88704c12.03712 9.97888 31.26272 9.66144 42.95168-0.70144l137.6-144.25088c11.68384-10.36288 11.42784-26.84416-0.59904-36.82816-12.03712-9.97888-31.26784-9.66144-42.95168 0.70656z" fill="#0B1956"></path></svg>`;
    });
  });
});


// 产品滑动
    (function() {
      document.addEventListener("DOMContentLoaded", function() {
        const wrappers = document.querySelectorAll('.sidebar-widget-wrapper');
        
        wrappers.forEach(wrapper => {
          const container = wrapper.querySelector('.product-scroll-window');
          const upBtn = wrapper.querySelector('.up-btn');
          const downBtn = wrapper.querySelector('.down-btn');
          

          if(container && upBtn && downBtn) {
            const scrollAmount = 100;

            upBtn.addEventListener('click', (e) => {
              e.preventDefault();
              container.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
            });

            downBtn.addEventListener('click', (e) => {
              e.preventDefault();
              container.scrollBy({ top: scrollAmount, behavior: 'smooth' });
            });
          }
        });
      });
    })();