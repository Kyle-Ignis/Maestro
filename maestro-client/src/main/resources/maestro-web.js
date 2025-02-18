(function ( maestro ) {
    const INVALID_TAGS = new Set(['noscript', 'script', 'br', 'img', 'svg', 'g', 'path'])

    const isInvalidTag = (node) => {
        return INVALID_TAGS.has(node.tagName.toLowerCase())
    }

    const getNodeText = (node) => {
        switch (node.tagName.toLowerCase()) {
            case 'input':
                return node.value || node.placeholder || node.ariaLabel || ''
            default:
                let text = ''
                const childNodes = [...(node.childNodes || [])].filter(node => node.nodeType === Node.TEXT_NODE)
                text = childNodes.map(node => node.textContent.trim()).join(' ')
                
                if (node.shadowRoot) {
                    const shadowText = [...node.shadowRoot.childNodes]
                        .filter(node => node.nodeType === Node.TEXT_NODE)
                        .map(node => node.textContent.trim())
                        .join(' ')
                    if (shadowText) {
                        text = text ? `${text} ${shadowText}` : shadowText
                    }
                }
                return text
        }
    }

    const getNodeBounds = (node) => {
        const rect = node.getBoundingClientRect()

        return `[${Math.round(rect.x)},${Math.round(rect.y)}][${Math.round(rect.x+rect.width)},${Math.round(rect.y+rect.height)}]`
    }

    const isDocumentLoading = () => document.readyState !== 'complete'

    const traverse = (node) => {
        if (!node || isInvalidTag(node)) return null

        let children = []
        if (node.shadowRoot) {
            children = [...(node.shadowRoot.children || [])].map(child => traverse(child)).filter(el => !!el)
        }
        children = children.concat([...node.children || []].map(child => traverse(child)).filter(el => !!el))

        const attributes = {
            text: getNodeText(node),
            bounds: getNodeBounds(node),
        }

        if (!!node.id || !!node.ariaLabel || !!node.name || !!node.title || !!node.htmlFor || !!node.attributes['data-testid']) {
            attributes['resource-id'] = node.id || node.ariaLabel || node.name || node.title || node.htmlFor || node.attributes['data-testid']?.value
        }

        if (node.shadowRoot) {
            attributes['has-shadow-root'] = 'true'
        }

        if (node.tagName.toLowerCase() === 'body') {
            attributes['is-loading'] = isDocumentLoading()
        }

        return {
            attributes,
            children,
        }
    }

    // -------------- Public API --------------
    maestro.getContentDescription = () => {
        return traverse(document.body)
    }

    // https://stackoverflow.com/a/5178132
    maestro.createXPathFromElement = (domElement) => {
        var allNodes = document.getElementsByTagName('*');
        for (var segs = []; domElement && domElement.nodeType == 1; domElement = domElement.parentNode)
        {
            if (domElement.hasAttribute('id')) {
                    var uniqueIdCount = 0;
                    for (var n=0;n < allNodes.length;n++) {
                        if (allNodes[n].hasAttribute('id') && allNodes[n].id == domElement.id) uniqueIdCount++;
                        if (uniqueIdCount > 1) break;
                    }
                    if ( uniqueIdCount == 1) {
                        segs.unshift('id("' + domElement.getAttribute('id') + '")');
                        return segs.join('/');
                    } else {
                        segs.unshift(domElement.localName.toLowerCase() + '[@id="' + domElement.getAttribute('id') + '"]');
                    }
            } else if (domElement.hasAttribute('class')) {
                segs.unshift(domElement.localName.toLowerCase() + '[@class="' + domElement.getAttribute('class') + '"]');
            } else {
                for (i = 1, sib = domElement.previousSibling; sib; sib = sib.previousSibling) {
                    if (sib.localName == domElement.localName)  i++; }
                    segs.unshift(domElement.localName.toLowerCase() + '[' + i + ']');
            }
        }
        return segs.length ? '/' + segs.join('/') : null;
    }
}( window.maestro = window.maestro || {} ));
